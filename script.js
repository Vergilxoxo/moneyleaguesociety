const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

let playersPool = [];
let ownerBudgets = {};

// Owner Map
const ownerMap = {
  "1": "Ralf",
  "2": "TitleTownPat",
  "3": "MrNilsson",
  "4": "kleinerlouis",
  "5": "Ulle",
  "6": "TST1860",
  "7": "brab97",
  "8": "Himp84",
  "9": "TobiWalonso",
  "10": "49erflo",
  "11": "Heesy",
  "12": "CrazyGringo"
};

// 💰 Format Geld
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

function parseMoney(value) {
  if (!value) return NaN;

  return parseInt(
    value
      .replace(/\$/g, "")
      .replace(/\./g, "")
      .replace(/,/g, "")
  );
}

const parseValue = str => {
  if (!str) return 0;
  const num = str.toString().replace(/[^0-9]/g, "");
  return parseInt(num) || 0;
};

// ----------------------------
// Datenquellen
async function fetchSheetPlayers() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Sheet1");
  return await res.json();
}

async function fetchCutSheet() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/CutSheet");
  return await res.json();
}

async function fetchRosters() {
  const res = await fetch("https://api.sleeper.app/v1/league/1311998228123643904/rosters");
  return await res.json();
}

// ----------------------------
// Budget laden
async function loadOwnerBudgets() {
  const sheetData = await fetchSheetPlayers();
  const cutSheetData = await fetchCutSheet();
  const rosters = await fetchRosters();

  const teamCap = 160000000;

  const allYears = sheetData.flatMap(p =>
    Object.keys(p).filter(k => /^\d{4}$/.test(k))
  );

  const year = [...new Set(allYears)].sort()[0] || "2025";

  ownerBudgets = {};

  rosters.forEach(roster => {
    const owner = ownerMap[String(roster.roster_id)];
    if (!owner) return;

    const allIds = (roster.players || []).map(String);
    const taxiIds = (roster.taxi || []).map(String);
    const irIds = (roster.reserve || []).map(String);

    const activeIds = allIds.filter(id =>
      !taxiIds.includes(id) && !irIds.includes(id)
    );

    const activePlayers = activeIds
      .map(id => sheetData.find(p => String(p["Player ID"]) === id))
      .filter(Boolean);

    const deadCapPlayers = cutSheetData.filter(p => p.Owner === owner);

    const sumForYear = players =>
      players.reduce((sum, p) => sum + parseValue(p[year]), 0);

    const capSpace =
      teamCap -
      sumForYear(activePlayers) -
      sumForYear(deadCapPlayers);

    ownerBudgets[owner] = capSpace;
  });

  console.log("OWNER BUDGETS:", ownerBudgets);
}

// ----------------------------
// Verfügbares Budget berechnen
async function getRemainingBudget(owner) {
  if (!ownerBudgets[owner]) {
    await loadOwnerBudgets();
  }

  const baseBudget = ownerBudgets[owner] || 0;

  const { data, error } = await supabaseClient
    .from("auction_players")
    .select("current_bid, highest_bidder, status")
    .eq("highest_bidder", owner);

  if (error) {
    console.log("BUDGET ERROR:", error);
    return baseBudget;
  }

  const committed = (data || []).reduce((sum, p) => {
    if (p.status === "active" || p.status === "finished") {
      return sum + Number(p.current_bid || 0);
    }
    return sum;
  }, 0);

  return baseBudget - committed;
}

// ⏱️ Restzeit berechnen
function formatTimeLeft(endTime) {
  if (!endTime) return "-";

  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;

  if (diff <= 0) return "⛔ Abgelaufen";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const timeString = `${hours}h ${minutes}m`;

  if (diff < 60 * 60 * 1000) {
    return `<span style="color:#ff4d4d; font-weight:600;">🔴 ${timeString}</span>`;
  }

  if (diff < 6 * 60 * 60 * 1000) {
    return `<span style="color:#ffa500; font-weight:600;">🟠 ${timeString}</span>`;
  }

  return `<span style="color:#4caf50;">🟢 ${timeString}</span>`;
}

// 🔄 Sleeper Sync
document.getElementById("syncBtn").addEventListener("click", syncPlayers);

async function syncPlayers(auto = false) {
  const btn = document.getElementById("syncBtn");

  btn.classList.remove("success", "error");
  btn.classList.add("loading");
  btn.innerText = "Lade...";

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

    btn.classList.remove("loading");
    btn.classList.add("success");
    btn.innerText = "Spieler geladen";

  } catch (err) {
    console.error(err);

    btn.classList.remove("loading");
    btn.classList.add("error");
    btn.innerText = "Fehler";
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
    li.innerText = `${player.full_name} - ${player.position} - ${player.team || "FA"}`;

    li.addEventListener("click", () => {
      input.value = player.full_name;
      input.dataset.playerId = player.player_id;
      input.dataset.position = player.position;
      input.dataset.team = player.team || "FA";
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

// 💵 Money Input
const amountInput = document.getElementById("amountInput");

amountInput.addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");

  if (!value) {
    e.target.value = "";
    return;
  }

  const numberValue = parseInt(value, 10);
  e.target.value = "$" + numberValue.toLocaleString("de-DE");
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

  let needsReload = false;

  for (const p of data) {
    if (p.status === "active" && p.end_time) {
      if (new Date(p.end_time) < new Date()) {
        await supabaseClient
          .from("auction_players")
          .update({ status: "finished" })
          .eq("player_id", p.player_id);

        needsReload = true;
      }
    }
  }

  if (needsReload) {
    return loadPlayers();
  }

  renderTable(data);
}

// 🎨 Tabellen rendern
function renderTable(players) {
  const activeTable = document.getElementById("playersTable");
  const finishedTable = document.getElementById("finishedPlayersTable");

  activeTable.innerHTML = "";
  finishedTable.innerHTML = "";

  players.forEach(p => {
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
  const rawAmount = document.getElementById("amountInput").value;
  const amount = parseMoney(rawAmount);

  const playerId = input.dataset.playerId;
  const position = input.dataset.position;
  const team = input.dataset.team;

  if (!playerName || !bidderName || !amount || !playerId) {
    alert("Bitte Spieler aus der Liste wählen!");
    return;
  }

  const remainingBudget = await getRemainingBudget(bidderName);

  if (amount > remainingBudget) {
    alert(`Nicht genug Budget! Verfügbar: ${formatMoney(remainingBudget)}`);
    return;
  }

  const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player_id", playerId)
    .maybeSingle();

  if (!existing) {
    if (amount < 500000) {
      alert("Mindestgebot beträgt $500.000");
      return;
    }

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
    if (existing.highest_bidder === bidderName) {
      alert("Du bist bereits Höchstbietender!");
      return;
    }

    const isExpired = new Date(existing.end_time) < new Date();

    if (existing.status === "finished" || isExpired) {
      alert("Diese Auktion ist beendet");
      return;
    }

    if (amount < existing.current_bid + 100000) {
      alert(`Gebot muss mindestens ${formatMoney(existing.current_bid + 100000)} sein`);
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

  input.value = "";
  input.dataset.playerId = "";
  input.dataset.position = "";
  input.dataset.team = "";

  document.getElementById("bidderInput").selectedIndex = 0;
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
loadOwnerBudgets();
syncPlayers(true);
