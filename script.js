const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

let playersPool = [];

// 💰 Format
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

// 🔄 Sleeper Sync (Frontend)
document.getElementById("syncBtn").addEventListener("click", syncPlayers);

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

    const freeAgents = Object.values(players).filter(
      p => p.player_id && !rostered.has(p.player_id)
    );

    playersPool = freeAgents;

    status.innerText = "✅ " + freeAgents.length + " Spieler geladen";

  } catch (err) {
    status.innerText = "❌ Fehler beim Laden";
    console.error(err);
  }
}

// 🔍 Autocomplete
const input = document.getElementById("playerInput");
const dropdown = document.getElementById("playerDropdown");

input.addEventListener("input", () => {
  const value = input.value.toLowerCase();
  dropdown.innerHTML = "";

  if (!value) return;

  const filtered = playersPool
    .filter(p => p.full_name?.toLowerCase().includes(value))
    .slice(0, 10);

  filtered.forEach(player => {
    const li = document.createElement("li");
    li.innerText = `${player.full_name} (${player.position})`;

    li.style.padding = "5px";
    li.style.cursor = "pointer";

    li.addEventListener("click", () => {
      input.value = player.full_name;
      dropdown.innerHTML = "";
    });

    dropdown.appendChild(li);
  });
});

// Dropdown schließen
document.addEventListener("click", (e) => {
  if (!input.contains(e.target)) {
    dropdown.innerHTML = "";
  }
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
        <td>${formatMoney(p.current_bid)}</td>
        <td>${p.highest_bidder || "-"}</td>
      </tr>
    `;
  });
}

// 💸 Bieten
async function bid() {
  const playerName = input.value.trim();
  const bidderName = document.getElementById("bidderInput").value.trim();
  const amount = parseInt(document.getElementById("amountInput").value);

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
        highest_bidder: bidderName
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
        highest_bidder: bidderName
      })
      .eq("id", existing.id);

    console.log("UPDATE ERROR:", error);
  }

  // 🧹 Inputs leeren
  input.value = "";
  document.getElementById("bidderInput").value = "";
  document.getElementById("amountInput").value = "";

  input.focus();
}

// Button Event
document.getElementById("bidBtn").addEventListener("click", bid);

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
    () => {
      loadPlayers();
    }
  )
  .subscribe();

// 🔁 Fallback
setInterval(loadPlayers, 3000);

// Start
loadPlayers();
