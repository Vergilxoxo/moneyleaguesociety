// ------------------------------------
// players.js
// ------------------------------------

// Alle Spieler speichern
let allPlayers = [];

// Spieler aus OpenSheet laden
async function fetchSheetPlayers() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Sheet1");
  const data = await res.json();
  return data;
}

// Sleeper API abrufen
async function fetchSleeperPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  const data = await res.json();
  return data;
}

// Sortierfunktion
let currentSort = {
  key: null,
  direction: "asc" // asc | desc
};

function sortPlayers(players) {
  if (!currentSort.key) return players;

  return [...players].sort((a, b) => {
    let valA = a[currentSort.key] ?? "";
    let valB = b[currentSort.key] ?? "";

    // Zahlen erkennen
    const isPureNumber = v =>
      typeof v === "number" ||
      (typeof v === "string" && /^[\d.,€$ ]+$/.test(v));

    const numA = isPureNumber(valA) ? parseMoney(valA) : NaN;
    const numB = isPureNumber(valB) ? parseMoney(valB) : NaN;
    const bothNumeric = !isNaN(numA) && !isNaN(numB);

    if (bothNumeric) {
      return currentSort.direction === "asc"
        ? numA - numB
        : numB - numA;
    }

    // Textvergleich
    return currentSort.direction === "asc"
      ? valA.toString().localeCompare(valB.toString(), "de", { numeric: true })
      : valB.toString().localeCompare(valA.toString(), "de", { numeric: true });
  });
}

// Parse Money Values fuer Sortierung
function parseMoney(value) {
  if (typeof value !== "string") return NaN;

  return Number(
    value
      .replace(/[^0-9.,-]/g, "") // alles außer Zahlen , . -
      .replace(/\./g, "")        // Tausenderpunkte entfernen
      .replace(/,/g, ".")        // Komma → Dezimalpunkt
  );
}

// Tabelle bauen
function buildPlayerTable(players) {
  const tbody = document.querySelector("#players-table tbody");
  tbody.innerHTML = "";

  players = sortPlayers(players);

  // Jahres-Spalten automatisch erkennen
  const allYears = new Set();
  players.forEach(p => Object.keys(p).forEach(k => {
    if (!isNaN(Number(k))) allYears.add(k);
  }));
  const yearArray = Array.from(allYears).sort();

  // Tabellenkopf für Jahre ergänzen
  const theadRow = document.querySelector("#players-table thead tr");
  yearArray.forEach(y => {
    if (![...theadRow.children].some(th => th.textContent === y)) {
      const th = document.createElement("th");
      th.textContent = y;
      th.dataset.key = y;
      theadRow.appendChild(th);
    }
  });

  // Zeilen aufbauen
  players.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p["Player ID"]}</td>
      <td><a href="player.html?id=${p["Player ID"]}" class="player-link">${p["full_name"] || "Unbekannt"}</a></td>
      <td>${p["position"] || "-"}</td>
      <td>${p["team"] || "-"}</td>
      <td>${p["Contract"] || "-"}</td>
    `;
    yearArray.forEach(y => {
      const td = document.createElement("td");
      td.textContent = p[y] || "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

    // Sortier-Header aktivieren
  document.querySelectorAll("#players-table thead th").forEach(th => {
    const key = th.dataset.key;
    if (!key) return;

    th.onclick = () => {
      if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
      } else {
        currentSort.key = key;
        currentSort.direction = "asc";
      }
      applyFilters();
    };

    th.classList.remove("sort-asc", "sort-desc");
    if (currentSort.key === key) {
      th.classList.add(
        currentSort.direction === "asc" ? "sort-asc" : "sort-desc"
      );
    }
  });
}


// Filter/Search anwenden
function applyFilters() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  const positionFilter = document.getElementById("position-filter").value;
  const teamFilter = document.getElementById("team-filter").value;

  const filtered = allPlayers.filter(p => {
    const matchesSearch = p["full_name"]?.toLowerCase().includes(searchTerm);
    const matchesPosition = positionFilter ? p["position"] === positionFilter : true;
    const matchesTeam = teamFilter ? p["team"] === teamFilter : true;
    return matchesSearch && matchesPosition && matchesTeam;
  });

  buildPlayerTable(filtered);
}

// Initialisierung
async function initPlayers() {
  // 1️⃣ Sheet-Daten
  const sheetData = await fetchSheetPlayers();

  // 2️⃣ Sleeper API Daten
  const sleeperData = await fetchSleeperPlayers();

  // 3️⃣ Daten anreichern
  allPlayers = sheetData.map(p => {
    const sleeperPlayer = Object.values(sleeperData).find(sp => sp.player_id === p["Player ID"]);
    return {
      ...p,
      full_name: sleeperPlayer?.full_name || "Unbekannt",
      position: sleeperPlayer?.position || "-",
      team: sleeperPlayer?.team || "-"
    };
  });

  // 4️⃣ Filter-Optionen füllen
  const positions = [...new Set(allPlayers.map(p => p.position).filter(Boolean))].sort();
  const teams = [...new Set(allPlayers.map(p => p.team).filter(Boolean))].sort();

  const positionSelect = document.getElementById("position-filter");
  positions.forEach(pos => {
    const option = document.createElement("option");
    option.value = pos;
    option.textContent = pos;
    positionSelect.appendChild(option);
  });

  const teamSelect = document.getElementById("team-filter");
  teams.forEach(team => {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    teamSelect.appendChild(option);
  });

  // Tabelle aufbauen
  buildPlayerTable(allPlayers);
}

// Eventlistener
document.getElementById("search-input").addEventListener("input", applyFilters);
document.getElementById("position-filter").addEventListener("change", applyFilters);
document.getElementById("team-filter").addEventListener("change", applyFilters);

// Init starten
initPlayers();
