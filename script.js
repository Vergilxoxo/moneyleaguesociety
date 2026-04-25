const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

let playersPool = [];

// 💰 Format Geld
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

// ⏱️ NEU: Restzeit berechnen
function formatTimeLeft(endTime) {
  if (!endTime) return "-";

  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;

  if (diff <= 0) return "⛔ Abgelaufen";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const timeString = `${hours}h ${minutes}m`;

  // 🔴 < 1 Stunde
  if (diff < 60 * 60 * 1000) {
    return `<span style="color:#ff4d4d; font-weight:600;">🔴 ${timeString}</span>`;
  }

  // 🟠 < 6 Stunden
  if (diff < 6 * 60 * 60 * 1000) {
    return `<span style="color:#ffa500; font-weight:600;">🟠 ${timeString}</span>`;
  }

  // 🟢 >= 6 Stunden
  return `<span style="color:#4caf50;">🟢 ${timeString}</span>`;
}

// 🔄 Sleeper Sync
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
    li.innerText = `${player.full_name} - ${player.position} - ${player.team}`;

    li.addEventListener("click", () => {
      input.value = player.full_name;
      input.dataset.playerId = player.player_id; // Player ID Unique
      input.dataset.position = player.position;
      input.dataset.team = player.team;
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

  // ⏱️ NEU: Ablauf prüfen
  for (const p of data) {
    if (p.status === "active" && p.end_time) {
      if (new Date(p.end_time) < new Date()) {
        await supabaseClient
          .from("auction_players")
          .update({ status: "finished" })
          .eq("id", p.id);
      }
    }
  }

  renderTable(data);
}

// 🎨 Tabelle
function renderTable(players) {
  const activeTable = document.getElementById("playersTable");
  const finishedTable = document.getElementById("finishedPlayersTable");

  activeTable.innerHTML = "";
  finishedTable.innerHTML = "";

  players.forEach(p => {

    // 🟢 AKTIVE AUKTION
    if (p.status !== "finished") {
      activeTable.innerHTML += `
        <tr>
          <td>${p.player}</td>
          <td>${p.position || "-"}</td>
          <td>${p.team || "-"}</td>
          <td>${formatMoney(p.current_bid)}</td>
          <td>${p.highest_bidder || "-"}</td>
          <td>${formatTimeLeft(p.end_time)}</td>
        </tr>
      `;
    }

    // 🔴 VERKAUFT
    if (p.status === "finished") {
      finishedTable.innerHTML += `
        <tr>
          <td>${p.player}</td>
          <td>${p.position || "-"}</td>
          <td>${p.team || "-"}</td>
          <td>${formatMoney(p.current_bid)}</td>
          <td>${p.highest_bidder || "-"}</td>
        </tr>
      `;
    }

  });
}

// 💸 Bieten
async function bid() {
  const playerName = input.value.trim();
  const bidderName = document.getElementById("bidderInput").value.trim();
  const amount = parseInt(document.getElementById("amountInput").value);

  const playerId = input.dataset.playerId;
  const position = input.dataset.position;
  const team = input.dataset.team;

  if (!playerName || !bidderName || !amount || !playerId) {
    alert("Bitte Spieler aus der Liste wählen!");
    return;
  }

  const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  // 🆕 INSERT
  if (!existing) {
    const { error } = await supabaseClient
      .from("auction_players")
      .insert({
        player_id: playerId,
        player: playerName,
        position,
        team,
        current_bid: amount,
        highest_bidder: bidderName,
        end_time: endTime.toISOString(),
        status: "active"
      });

    console.log("INSERT ERROR:", error);

  } else {

    const isExpired = new Date(existing.end_time) < new Date();

    if (existing.status === "finished" || isExpired) {
      alert("Diese Auktion ist beendet");
      return;
    }

    if (amount <= existing.current_bid) {
      alert("Gebot muss höher sein als " + existing.current_bid);
      return;
    }

    const { error } = await supabaseClient
      .from("auction_players")
      .update({
        current_bid: amount,
        highest_bidder: bidderName,
        end_time: endTime.toISOString()
      })
      .eq("player_id", playerId);

    console.log("UPDATE ERROR:", error);
  }

  // Reset
  input.value = "";
  input.dataset.playerId = "";
  input.dataset.position = "";
  input.dataset.team = "";

  document.getElementById("bidderInput").value = "";
  document.getElementById("amountInput").value = "";
}

// Button
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

// 🔁 Fallback Refresh
setInterval(loadPlayers, 5000);

// 🚀 Start
loadPlayers();
