// ----------------------------
// Konfiguration
// ----------------------------
const leagueId = "1311998228123643904";

// ----------------------------
// Daten laden
// ----------------------------
async function fetchSheetPlayers() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Sheet1");
  return await res.json();
}

async function fetchCutSheet() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/CutSheet");
  return await res.json();
}

async function fetchSleeperPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  return await res.json();
}

// ----------------------------
// Hauptfunktion zum Laden des Rosters
// ----------------------------
async function loadRosterPage(rosterId) {
  const sheetData = await fetchSheetPlayers();
  const sleeperData = await fetchSleeperPlayers();
  const cutSheetData = await fetchCutSheet();

  // Daten im globalen Cache speichern für Salary Checkbox Updates
  window.sheetDataCache = sheetData;
  window.cutSheetDataCache = cutSheetData;

  // Alle Roster der League abrufen
  const rosterRes = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  const rosters = await rosterRes.json();
  const roster = rosters.find(r => r.roster_id == rosterId);
  if (!roster) return;

  const rosterName = document.getElementById("roster-select").selectedOptions[0].textContent;

  const allIds = (roster.players || []).map(String);
  const taxiIds = (roster.taxi || []).map(String);
  const irIds = (roster.reserve || []).map(String);
  const activeIds = allIds.filter(id => !taxiIds.includes(id) && !irIds.includes(id));

  // Jahres-Spalten dynamisch ermitteln
  const yearCols = Array.from(
    new Set(sheetData.flatMap(p => Object.keys(p).filter(k => /^\d{4}$/.test(k))))
  ).sort();
  window.yearColsCache = yearCols;

  const fixedCols = ["Player ID", "Name", "Position", "NFL Team", "Contract"];

  // Tabellen Header aufbauen
  ["active-roster", "taxi-roster", "ir-roster"].forEach(tableId => {
    const row = document.getElementById(`${tableId}-header`);
    row.innerHTML = "";
    fixedCols.forEach(c => {
      const th = document.createElement("th");
      th.textContent = c;
      th.dataset.sort = c;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => sortTable(tableId, th.cellIndex));
      row.appendChild(th);
    });
    yearCols.forEach(y => {
      const th = document.createElement("th");
      th.textContent = y;
      th.dataset.sort = y;
      th.style.cursor = "pointer";
      th.addEventListener("click", () => sortTable(tableId, th.cellIndex));
      row.appendChild(th);
    });
  });

  // ----------------------------
  // Spieler-Mapping
  // ----------------------------
  function mapPlayer(id) {
    const sleeper = Object.values(sleeperData).find(p => String(p.player_id) === id) || {};
    const sheet = sheetData.find(p => String(p["Player ID"]) === id) || {};
    return { ...sheet, ...sleeper };
  }

  function renderTable(tableId, ids) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = "";
    ids.map(mapPlayer).forEach(p => {
      const tr = document.createElement("tr");
      const pos = p.position || "-";
      let html = `
        <td>${p.player_id || p["Player ID"] || "-"}</td>
        <td>${p.full_name || "-"}</td>
        <td class="pos-${pos}">${pos}</td>
        <td>${p.team || "-"}</td>
        <td>${p.Contract || "-"}</td>
      `;
      yearCols.forEach(y => html += `<td>${p[y] || "-"}</td>`);
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });
    // Checkboxen hinzufügen
    addPlayerCheckboxes(tableId);
  }

  renderTable("active-roster", activeIds);
  renderTable("taxi-roster", taxiIds);
  renderTable("ir-roster", irIds);

  // Filter Name
  const nameFilter = document.getElementById("name-filter");
  nameFilter.oninput = () => {
    const filter = nameFilter.value.toLowerCase();
    ["active-roster","taxi-roster","ir-roster"].forEach(tableId => {
      const tbody = document.querySelector(`#${tableId} tbody`);
      Array.from(tbody.rows).forEach(r => {
        r.style.display = r.cells[1].textContent.toLowerCase().includes(filter) ? "" : "none";
      });
    });
  };

  // Positionsfilter
  const posSelect = document.getElementById("position-filter");
  const positionsSet = new Set();
  const rosterPlayerIds = [...activeIds, ...taxiIds, ...irIds];
  sheetData.forEach(p => {
    const id = String(p["Player ID"]);
    if (rosterPlayerIds.includes(id)) {
      const pos = (p.Position || '').toUpperCase().trim();
      if (pos) positionsSet.add(pos);
    }
  });
  Object.values(sleeperData).forEach(p => {
    const id = String(p.player_id);
    if (rosterPlayerIds.includes(id)) {
      const pos = (p.position || '').toUpperCase().trim();
      if (pos) positionsSet.add(pos);
    }
  });
  const positions = Array.from(positionsSet).sort();
  posSelect.innerHTML = '<option value="">Alle Positionen</option>';
  positions.forEach(p => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    posSelect.appendChild(option);
  });
  posSelect.onchange = () => {
    const val = posSelect.value.toUpperCase().trim();
    ["active-roster","taxi-roster","ir-roster"].forEach(tableId => {
      const tbody = document.querySelector(`#${tableId} tbody`);
      Array.from(tbody.rows).forEach(r => {
        const pos = (r.cells[2].textContent || '').toUpperCase().trim();
        r.style.display = !val || pos === val ? "" : "none";
      });
    });
  };

  // Dead Cap Tabelle rendern
  renderDeadCapTable(cutSheetData, rosterName);

  // Salary Cap Block initial rendern
  updateSalaryCap();
  setupRosterVisibilityToggles();
}

// ----------------------------
// Dead Cap Tabelle
// ----------------------------
function renderDeadCapTable(data, rosterName) {
  const header = document.getElementById("deadcap-header");
  const tbody = document.querySelector("#deadcap-table tbody");
  header.innerHTML = "";
  tbody.innerHTML = "";
  if (!data.length) return;

  const fixedCols = ["Name", "Status"];
  const yearCols = Array.from(
    new Set(data.flatMap(r => Object.keys(r).filter(k => /^\d{4}$/.test(k))))
  ).sort();
  const cols = [...fixedCols, ...yearCols];

  cols.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c;
    header.appendChild(th);
  });

  const filteredData = data.filter(r => r.Owner === rosterName);

  filteredData.forEach(row => {
    const tr = document.createElement("tr");
    cols.forEach(c => {
      const td = document.createElement("td");
      td.textContent = row[c] || "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ----------------------------
// Helper zum Parsen von Werten
// ----------------------------
const parseValue = str => {
  if (!str) return 0;
  const num = str.toString().replace(/[^0-9]/g,'');
  return parseInt(num) || 0;
};

// ----------------------------
// Checkboxen pro Spieler
// ----------------------------
function addPlayerCheckboxes(tableId) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  Array.from(tbody.rows).forEach(row => {
    if (!row.querySelector(".player-checkbox")) {
      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "player-checkbox";
      checkbox.checked = true;
      checkbox.addEventListener("change", updateSalaryCap);
      td.appendChild(checkbox);
      row.insertBefore(td, row.cells[0]);
    }
  });
}

// ----------------------------
// Spieler für Salary Berechnung
// ----------------------------
function getSelectedPlayers(tableId, sheetData) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return [];
  const players = [];
  Array.from(tbody.rows).forEach(row => {
    const checkbox = row.querySelector(".player-checkbox");
    if (checkbox && checkbox.checked) {
      const playerId = row.cells[1].textContent;
      const p = sheetData.find(p => String(p["Player ID"]) === playerId);
      if (p) players.push(p);
    }
  });
  return players;
}

// ----------------------------
// Salary Cap Block rendern
// ----------------------------
function renderSalaryCapBlock(sheetData, cutSheetData, rosterName, yearCols) {
  let container = document.getElementById("salary-cap-block");
  if (!container) {
    container = document.createElement("div");
    container.id = "salary-cap-block";
    container.className = "filter-container";
    container.style.flexDirection = "column";
    container.style.marginBottom = "15px";
    const filters = document.querySelector(".filter-container");
    filters.parentNode.insertBefore(container, filters.nextSibling);
  }
  container.innerHTML = "";

  const fixedRows = ["Team Salary Cap", "Used Salary Cap", "Injured Reserve", "Dead Cap", "Team Cap Space"];
  const teamCap = 160000000;

  const activePlayers = getSelectedPlayers("active-roster", sheetData);
  const irPlayers = getSelectedPlayers("ir-roster", sheetData);
  const deadCapPlayers = cutSheetData.filter(p => p.Owner === rosterName);

  const table = document.createElement("table");
  table.style.width = "100%";
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headerTr = document.createElement("tr");
  const firstTh = document.createElement("th");
  firstTh.textContent = rosterName;
  headerTr.appendChild(firstTh);
  yearCols.forEach(y => {
    const th = document.createElement("th");
    th.textContent = y;
    headerTr.appendChild(th);
  });
  thead.appendChild(headerTr);

  const sumForYear = (players, year) => players.reduce((sum,p) => sum + parseValue(p[year]), 0);
  const sumDeadCapForYear = (players, year) => players.reduce((sum,p) => sum + parseValue(p[year]), 0);

  fixedRows.forEach(rowName => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = rowName;
    tr.appendChild(th);

    yearCols.forEach(y => {
      const td = document.createElement("td");
      let value = 0;
      switch(rowName){
        case "Team Salary Cap": value = teamCap; break;
        case "Used Salary Cap": value = sumForYear(activePlayers, y); break;
        case "Injured Reserve": value = sumForYear(irPlayers, y); break;
        case "Dead Cap": value = sumDeadCapForYear(deadCapPlayers, y); break;
        case "Team Cap Space": value = teamCap - sumForYear(activePlayers, y) - sumDeadCapForYear(deadCapPlayers, y); break;
      }
      td.textContent = `$${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g,".")}`;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

// ----------------------------
// Update Salary Cap
// ----------------------------
function updateSalaryCap() {
  const rosterName = document.getElementById("roster-select").selectedOptions[0].textContent;
  renderSalaryCapBlock(window.sheetDataCache, window.cutSheetDataCache, rosterName, window.yearColsCache);
}

// ----------------------------
// Sortierung
// ----------------------------
function sortTable(tableId, colIndex) {
  const table = document.getElementById(tableId);
  const tbody = table.tBodies[0];
  const rows = Array.from(tbody.rows);
  const asc = !table.dataset.asc || table.dataset.asc === "false";
  rows.sort((a,b) => {
    let aVal = a.cells[colIndex].textContent.replace(/\$|\./g,"");
    let bVal = b.cells[colIndex].textContent.replace(/\$|\./g,"");
    if(!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))){
      return asc ? aVal-bVal : bVal-aVal;
    }
    return asc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });
  rows.forEach(r => tbody.appendChild(r));
  table.dataset.asc = asc;
}

// ----------------------------
// Sichtbarkeit Active / Taxi / IR
// ----------------------------
function setupRosterVisibilityToggles() {
  const toggleMap = [
    { checkbox: "toggle-active", section: "section-active" },
    { checkbox: "toggle-taxi", section: "section-taxi" },
    { checkbox: "toggle-ir", section: "section-ir" }
  ];

  toggleMap.forEach(({ checkbox, section }) => {
    const cb = document.getElementById(checkbox);
    const sec = document.getElementById(section);
    if (!cb || !sec) return;

    const updateVisibility = () => {
      sec.style.display = cb.checked ? "" : "none";
      updateSalaryCap();
    };

    cb.removeEventListener("change", updateVisibility);
    cb.addEventListener("change", updateVisibility);
    updateVisibility();
  });
}

// ----------------------------
// Roster Auswahl Event
// ----------------------------
document.getElementById("roster-select").addEventListener("change", e => {
  loadRosterPage(e.target.value);
});

// initial laden
loadRosterPage(document.getElementById("roster-select").value);
