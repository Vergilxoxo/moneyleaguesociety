const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

let playersPool = [];

// 💰 Format
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

// 🔄 Sleeper Sync
async function syncPlayers() {
  const status = document.getElementById("status");
  status.innerText = "⏳ Lade Spieler...";

  const LEAGUE_ID = "1311998228123643904";

  try {
    const playersRes = await fetch("https://api.sleeper.app/v1/players/nfl");
    const players = await playersRes.json();

    const rosterRes = await fetch(
      `https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`
    );
    const rosters = await rosterRes.json();

    const rostered = new Set(
      rosters.flatMap(r => r.players || [])
    );

    playersPool = Object.values(players).filter(
      p => p.player_id && !rostered.has(p.player_id)
    );

    status.innerText = "✅ " + playersPool.length + " Spieler geladen";

  } catch (err) {
    console.error(err);
    status.innerText = "❌ Fehler beim Laden";
  }
}

// 🔍 Autocomplete
document.addEventListener("DOMContentLoaded", () => {

  const input = document.getElementById("playerInput");
  const dropdown = document.getElementById("playerDropdown");

  document.getElementById("syncBtn").addEventListener("click", syncPlayers);
  document.getElementById("bidBtn").addEventListener("click", bid);

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase();
    dropdown.innerHTML = "";

    if (!value) return;

    const filtered = playersPool
      .filter(p =>
        p.full_name?.toLowerCase().includes(value)
      )
      .slice(0, 10);

    filtered.forEach(player => {
      const li = document.createElement("li");

      li.innerText =
        `${player.full_name} - ${player.position || "?"} - ${player.team || "FA"}`;

      li.style.padding = "6px";
      li.style.cursor = "pointer";

      li.addEventListener("click", () => {
        input.value = player.full_name;
        input.dataset.position = player.position;
        input.dataset.team = player.team;
        dropdown.innerHTML = "";
      });

      dropdown.appendChild(li);
    });
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target)) {
      dropdown.innerHTML = "";
    }
  });

});

// 📊 Daten laden
async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("auction_players")
    .select("*");

  if (error) {
    console.log("LOAD ERROR:", error);
    return;
  }

  renderTable(data);
}

// 🎨 Tabelle
function renderTable(players) {
  const table = document.getElementById("playersTable");
  table.innerHTML = "";

  players.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.player}</td>
        <td>${p.position || "-"}</td>
        <td>${p.team || "-"}</td>
        <td>${formatMoney(p.current_bid)}</td>
        <td>${p.highest_bidder || "-"}</td>
      </tr>
    `;
  });
}

// 💸 Bieten
async function bid() {

  const input = document.getElementById("playerInput");

  const playerName = input.value.trim();
  const bidderName = document.getElementById("bidderInput").value.trim();
  const amount = parseInt(document.getElementById("amountInput").value);

  const position = input.dataset.position;
  const team = input.dataset.team;

  if (!playerName || !bidderName || !amount) {
    alert("Bitte alle Felder ausfüllen");
    return;
  }

  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player", playerName)
    .maybeSingle();

  if (!existing) {

    const { error } = await supabaseClient
      .from("auction_players")
      .insert({
        player: playerName,
        current_bid: amount,
        highest_bidder: bidderName,
        position: position,
        team: team
      });

    console.log("INSERT ERROR:", error);

  } else {

    if (amount <= existing.current_bid) {
      alert("Gebot muss höher sein als " + existing.current_bid);
      return;
    }

    const { error } = await supabaseClient
      .from("auction_players")
      .update({
        current_bid: amount,
        highest_bidder: bidderName,
        position: position,
        team: team
      })
      .eq("id", existing.id);

    console.log("UPDATE ERROR:", error);
  }

  // 🧹 Reset
  input.value = "";
  input.dataset.position = "";
  input.dataset.team = "";

  document.getElementById("bidderInput").value = "";
  document.getElementById("amountInput").value = "";

  input.focus();
}

// 🔥 Realtime
supabaseClient
  .channel("auction_players_channel")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "auction_players"
    },
    () => loadPlayers()
  )
  .subscribe();

// 🔁 Fallback
setInterval(loadPlayers, 3000);

// Start
loadPlayers();
