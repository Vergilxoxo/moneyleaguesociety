// ------------------------------------
// transactions.js
// ------------------------------------

const leagueId = "1311998228123643904";

const ownerMap = {
  "465132695723175936": "Wombat Warriors",
  "499688619552796672": "Outlaws",
  "700775678882189312": "TobiWalonso",
  "461229417725685760": "TitleTownPat",
  "514886190662844416": "Eilbek Elephants",
  "731126368611491840": "DakStreet Boys",
  "374575842090569728": "Alles oder Penix",
  "587198224066977792": "Mordor's Dark Empire",
  "427153756321226752": "Calmont Gladiators",
  "593242356480790528": "Captain Bierccuneer",
  "463018762526781440": "Eastfrisian Ducks",
  "589565582072918016": "Muenster CardiNils"
};

let playerMap = {};
let rosterOwnerMap = {}; // roster_id -> owner_id

// --------------------------
// Spielerbilder & Typen
// --------------------------
function formatType(type) {
  switch(type) {
    case "add": return { label: "Signing", class: "add" };
    case "drop":
    case "free_agent": return { label: "Drop", class: "drop" }; // free_agent als Drop
    case "waiver": return { label: "Signing", class: "waiver" };
    case "trade": return { label: "Trade", class: "trade" };
    case "commissioner": return { label: "Commissioner", class: "commissioner" };
    default: return { label: type, class: "" };
  }
}

// --------------------------
// Sleeper Player Daten laden
// --------------------------
async function loadPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  const players = await res.json();

  Object.values(players).forEach(p => {
    playerMap[p.player_id] = {
      name: p.full_name,
      image: `https://sleepercdn.com/content/nfl/players/thumb/${p.player_id}.jpg`
    };
  });
}

// --------------------------
// Roster laden (für Teamnamen)
// --------------------------
async function loadRosters() {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  const rosters = await res.json();

  rosters.forEach(r => {
    rosterOwnerMap[r.roster_id] = r.owner_id;
  });
}

// --------------------------
// Transactions laden
// --------------------------
async function loadTransactions() {
  let allTransactions = [];

  for (let week = 1; week <= 18; week++) {
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${week}`);
      const data = await res.json();
      if (data && data.length > 0) allTransactions = allTransactions.concat(data);
    } catch (err) {
      console.error("Fehler bei Woche", week, err);
    }
  }

  renderTransactions(allTransactions);
}

// --------------------------
// Tabelle anzeigen
// --------------------------
function renderTransactions(transactions) {
  const tbody = document.querySelector("#transactions-table tbody");
  tbody.innerHTML = "";

  transactions.forEach(t => {
    let players = [];

    if (t.adds) players = Object.keys(t.adds);
    if (t.drops) players = players.concat(Object.keys(t.drops));

    players.forEach(pid => {
      const tr = document.createElement("tr");

      const player = playerMap[pid];
      const playerName = player ? player.name : pid;
      const playerImage = player
        ? `<img class="player-thumb" src="${player.image}" onerror="this.src='https://sleepercdn.com/images/nfl/nfl_player_placeholder.png'" alt="${playerName}">`
        : "";

      const fromRoster = t.drops?.[pid];
      const toRoster = t.adds?.[pid];

      const fromOwner = rosterOwnerMap[fromRoster];
      const toOwner = rosterOwnerMap[toRoster];

      const fromTeam = ownerMap[fromOwner] || "-";
      const toTeam = ownerMap[toOwner] || "-";

      const date = new Date(t.created).toLocaleDateString("de-DE");

      const typeInfo = formatType(t.type);

      tr.innerHTML = `
        <td>${date}</td>
        <td class="${typeInfo.class}">${typeInfo.label}</td>
        <td class="player-cell">${playerImage} ${playerName}</td>
        <td>${fromTeam}</td>
        <td>${toTeam}</td>
      `;

      tbody.appendChild(tr);
    });
  });
}

// --------------------------
// Suche
// --------------------------
function setupFilter() {
  const input = document.getElementById("search-input");
  input.addEventListener("input", () => {
    const filter = input.value.toLowerCase();
    document.querySelectorAll("#transactions-table tbody tr").forEach(row => {
      const player = row.children[2].textContent.toLowerCase();
      row.style.display = player.includes(filter) ? "" : "none";
    });
  });
}

// --------------------------
// Init
// --------------------------
document.addEventListener("DOMContentLoaded", async () => {
  await loadPlayers();
  await loadRosters();
  await loadTransactions();
  setupFilter();
});
