//const leagueId = "1207768406841892864";
const leagueId = "1311998228123643904";
// ----------------------------
// Fetcher
// ----------------------------
async function fetchSheetPlayers() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Sheet1");
  return await res.json();
}

async function fetchSleeperPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  return await res.json();
}

async function fetchRosters() {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  return await res.json();
}

// ----------------------------
// States
// ----------------------------
let allPlayers = [];
let filteredPlayers = [];

let currentSort = {
  key: null,
  direction: "asc"
};

// ----------------------------
// Init
// ----------------------------
async function initUndraftedTaxi() {
  const sheetData = await fetchSheetPlayers();
  const sleeperData = await fetchSleeperPlayers();
  const rosters = await fetchRosters();

  // Alle Taxi IDs der Liga sammeln
  const taxiIds = new Set();
  rosters.forEach(r => {
    (r.taxi || []).forEach(id => taxiIds.add(String(id)));
  });

  // Spieler filtern & mappen
  const players = sheetData
    .filter(p => {
      const id = String(p["Player ID"]);
      const isTaxi = taxiIds.has(id);
      const isUndrafted =
        p["Contract"] &&
        p["Contract"].toString().toLowerCase().includes("undrafted");
      return isTaxi && isUndrafted;
    })
    .map(p => {
      const sleeper = Object.values(sleeperData)
        .find(sp => String(sp.player_id) === String(p["Player ID"])) || {};
      return {
        ...p,
        full_name: sleeper.full_name || "Unbekannt",
        position: sleeper.position || "-",
        team: sleeper.team || "-"
      };
    });

  allPlayers = players;
  filteredPlayers = players;

  buildPositionFilter(allPlayers);
  applyFilters();


}

// ----------------------------
// Sortierung
function parseSortableValue(val, key) {
  if (val === null || val === undefined) return "";

  // Player ID als Zahl
  if (key === "Player ID") {
    const num = parseInt(val.toString().replace(/[^0-9]/g, ""));
    return isNaN(num) ? 0 : num;
  }

  // Contract als Text
  if (key === "Contract") {
    return val.toString().toLowerCase();
  }

  // Sonstige Spalten (Name, Position, Team) als Text
  return val.toString().toLowerCase();
}

function sortPlayers(players) {
  if (!currentSort.key) return players;

  return [...players].sort((a, b) => {
    const aVal = parseSortableValue(a[currentSort.key], currentSort.key);
    const bVal = parseSortableValue(b[currentSort.key], currentSort.key);

    if (typeof aVal === "number" && typeof bVal === "number") {
      return currentSort.direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    return currentSort.direction === "asc"
      ? aVal.localeCompare(bVal, "de", { numeric: true })
      : bVal.localeCompare(aVal, "de", { numeric: true });
  });
}

// ----------------------------
// Tabelle bauen
function buildTable(players) {
  const tbody = document.querySelector("#undrafted-table tbody");
  tbody.innerHTML = "";

  const sorted = sortPlayers(players);

  sorted.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p["Player ID"]}</td>
      <td>
        <a href="udfa-player.html?id=${p["Player ID"]}" class="player-link">
          ${p.full_name}
        </a>
      </td>
      <td>${p.position}</td>
      <td>${p.team}</td>
      <td>${p.Contract}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------
// Header Klick für Sortierung
document.querySelectorAll("#undrafted-table thead th").forEach(th => {
  const key = th.dataset.key;
  if (!key) return;

  th.onclick = () => {
    if (currentSort.key === key) {
      currentSort.direction =
        currentSort.direction === "asc" ? "desc" : "asc";
    } else {
      currentSort.key = key;
      currentSort.direction = "asc";
    }
    buildTable(filteredPlayers);
  };
});

function applyFilters() {
  const searchInput = document.getElementById("search-input");
  const positionSelect = document.getElementById("position-filter");

  const search = searchInput ? searchInput.value.toLowerCase() : "";
  const position = positionSelect ? positionSelect.value : "";

  filteredPlayers = allPlayers.filter(p => {
    const matchesSearch =
      p.full_name.toLowerCase().includes(search) ||
      String(p["Player ID"]).includes(search) ||
      (p.team || "").toLowerCase().includes(search);

    const matchesPosition =
      !position || p.position === position;

    return matchesSearch && matchesPosition;
  });

  buildTable(filteredPlayers);
}



function buildPositionFilter(players) {
  const select = document.getElementById("position-filter");
  if (!select) return;

  // alte Optionen entfernen (außer "Alle")
  select.querySelectorAll("option:not(:first-child)").forEach(o => o.remove());

  const positions = [...new Set(
    players
      .map(p => p.position)
      .filter(pos => pos && pos !== "-")
  )].sort();

  positions.forEach(pos => {
    const option = document.createElement("option");
    option.value = pos;
    option.textContent = pos;
    select.appendChild(option);
  });
}


// Eventlistener
const searchInput = document.getElementById("search-input");
const positionFilter = document.getElementById("position-filter");

if (searchInput) {
  searchInput.addEventListener("input", applyFilters);
}

if (positionFilter) {
  positionFilter.addEventListener("change", applyFilters);
}





// ----------------------------
// Start
initUndraftedTaxi();
