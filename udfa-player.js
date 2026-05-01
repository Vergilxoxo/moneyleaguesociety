// ------------------------------------
// player.js
// ------------------------------------

//const leagueId = "1207768406841892864"; // Deine League ID
const leagueId = "1311998228123643904";
const currentSeason = new Date().getFullYear(); // z.B. 2025

// Owner Map für Dynasty Teams
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

// Sheet-Daten abrufen
async function fetchSheetPlayers() {
  const res = await fetch("https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Sheet1");
  return await res.json();
}

// Sleeper API Player Daten abrufen
async function fetchSleeperPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  return await res.json();
}

async function fetchSeasonStats(season = currentSeason) {
  const res = await fetch(
    `https://api.sleeper.app/v1/stats/nfl/regular/${season}`
  );
  return await res.json();
}

// Dynasty Team abrufen
async function loadDynastyTeam(playerId, dynastyElement) {
  try {
    const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
    const rosters = await res.json();
    const roster = rosters.find(r => r.players.includes(playerId));

    if (roster) {
      const teamName = ownerMap[roster.owner_id] || "Unbekannt";
      dynastyElement.innerHTML = `<strong>Dynasty Team</strong><span>${teamName}</span>`;

    } else {
      dynastyElement.innerHTML = `<strong>Dynasty Team</strong><span>Nicht gefunden</span>
`;


    }
  } catch (err) {
    console.error(err);
    dynastyElement.textContent = "Dynasty Team: Fehler beim Laden";
    dynastyElement.innerHTML = `<strong>Dynasty Team</strong><span>Fehler beim Laden</span>
`;

  }
}

// Year Salary berechnen
function calculateYearSalary(player) {
  const years = ["2025","2026","2027","2028"];
  let total = 0, count = 0;

  years.forEach(y => {
    let val = player[y];
    if (val) {
      val = val.toString().replace(/[^\d]/g, ""); // "$8.000.000" -> "8000000"
      val = parseFloat(val);
      if (!isNaN(val)) {
        total += val;
        count++;
      }
    }
  });

  return count > 0 ? `$${(total / count).toLocaleString('de-DE')}` : "-";
}


// Player Page laden
async function loadPlayerPage(playerId) {
  const sheetData = await fetchSheetPlayers();
  const sleeperData = await fetchSleeperPlayers();

  const player = sheetData.find(p => String(p["Player ID"]) === playerId);
  if (!player) {
    document.getElementById("player").innerHTML = "<p>Spieler nicht gefunden</p>";
    return;
  }

  const sleeperPlayer = Object.values(sleeperData).find(sp => sp.player_id === playerId);

  const fullName = sleeperPlayer?.full_name || player["full_name"] || "Unbekannt";
  const position = sleeperPlayer?.position || player["position"] || "-";
  const team = sleeperPlayer?.team || player["team"] || "-";

  const playerDiv = document.getElementById("player");
  const imageUrl = `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;

  playerDiv.innerHTML = `
    <a href="undrafted-taxi.html" class="back-button">← Zurück zur UDFA</a>

    <div class="player-profile">
      <div class="player-image">
        <img src="${imageUrl}" alt="${fullName}"
           onerror="this.src='https://sleepercdn.com/images/nfl/nfl_player_placeholder.png'">
      </div>

      <div class="player-details">
        <h1>${fullName}</h1>

        <div class="badge-row">
          <span class="badge">${position}</span>
          <span class="badge secondary">${team}</span>
        </div>

        <div class="info-grid">
          <div><strong>Contract</strong><span>${player["Contract"] || "-"}</span></div>
          <div><strong>Year Average Salary</strong><span>${calculateYearSalary(player)}</span></div>
          <div id="dynasty-team"><strong>Dynasty Team</strong><span>Lädt…</span></div>
        </div>
      </div>
    </div>
  `;


  // Vertragsjahre Tabelle füllen
  const tbody = document.querySelector("#contract-table tbody");
  tbody.innerHTML = "";
  ["2025","2026","2027","2028"].forEach(y => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${y}</td><td>${player[y] || "-"}</td>`;
    tbody.appendChild(tr);
  });

  // Dynasty Team laden + Fade-In der Details
  const dynastyElement = document.getElementById("dynasty-team");
  loadDynastyTeam(playerId, dynastyElement).then(() => {
    document.querySelectorAll('.fade-detail').forEach(el => {
      setTimeout(() => el.classList.add('visible'), 100);
    });
  });
  loadSeasonPerformance(playerId, sleeperData);
}

// Season Performance Block
// Position Rank
function calculatePositionRank(stats, playerId, positionMap) {
  // positionMap = { player_id: "WR", ... } (aus deinem Sheet oder Sleeper)
  const playerPos = positionMap[playerId];
  if (!playerPos) return "-";

  // Filter alle Spieler der gleichen Position
  const samePos = Object.entries(stats)
    .filter(([pid, s]) => positionMap[pid] === playerPos)
    .map(([pid, s]) => ({ pid, pts: s.pts_ppr ?? 0 }));

  // Sort descending
  samePos.sort((a, b) => b.pts - a.pts);

  // Finde Rank
  const rank = samePos.findIndex(p => p.pid === playerId) + 1;
  return `${rank}/${samePos.length}`; // z.B. 5/120
}

async function loadSeasonPerformance(playerId, sleeperData) {
  const stats = await fetchSeasonStats();
  const p = stats[playerId];

  const grid = document.getElementById("performance-grid");

  if (!p) {
    grid.innerHTML = "<p class='empty'>Keine Stats für diese Saison</p>";
    return;
  }

  // Position Map erstellen
  const positionMap = {};
  Object.values(sleeperData).forEach(pl => {
    positionMap[pl.player_id] = pl.position;
  });

  const total = p.pts_ppr ?? 0;
  const games = p.gp ?? 0;
  const ppg = games > 0 ? (total / games).toFixed(2) : "0.00";
  const posRank = calculatePositionRank(stats, playerId, positionMap);

  grid.innerHTML = `
  <div class="stat-box">
    <span class="icon">⚡</span>
    <strong>Total Points</strong>
    <span>${total.toFixed(1)}</span>
  </div>
  <div class="stat-box">
    <span class="icon">🎮</span>
    <strong>Games Played</strong>
    <span>${games}</span>
  </div>
  <div class="stat-box">
    <span class="icon">📈</span>
    <strong>Points / Game</strong>
    <span>${ppg}</span>
  </div>
  <div class="stat-box">
    <span class="icon">🏆</span>
    <strong>Position Rank</strong>
    <span>${posRank}</span>
  </div>
`;
}

// URL-Parameter auslesen
const params = new URLSearchParams(window.location.search);
const playerId = params.get("id");
if (playerId) loadPlayerPage(playerId);
