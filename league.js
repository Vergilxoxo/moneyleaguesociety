// league.js
const leagueId = "1207768406841892864";

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

let rosters = [];
let matchups = [];

// Spieler-Stats pro Saison
async function fetchSeasonStats(season = new Date().getFullYear()) {
  const res = await fetch(`https://api.sleeper.app/v1/stats/nfl/regular/${season}`);
  return await res.json();
}

// Roster laden
async function loadRosters() {
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
  rosters = await res.json();
}

// Matchups laden
async function loadMatchups() {
  const season = new Date().getFullYear();
  const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${season}`);
  matchups = await res.json();
}

// Season Stats Cards rendern
async function renderSeasonCards() {
  const container = document.getElementById("league-stats");
  if (!container) return;

  container.innerHTML = "";

  const stats = await fetchSeasonStats();

  rosters.forEach(r => {
    let totalPoints = 0;
    let gamesPlayed = 0;

    r.players.forEach(pid => {
      const s = stats[pid];
      if (s) {
        totalPoints += s.pts_ppr ?? 0;
        gamesPlayed += s.gp ?? 0;
      }
    });

    const ppg = gamesPlayed > 0 ? (totalPoints / gamesPlayed).toFixed(2) : "-";

    const card = document.createElement("div");
    card.classList.add("stats-card");
    card.innerHTML = `
      <strong>${ownerMap[r.owner_id] || "-"}</strong>
      <div>Punkte: ${totalPoints.toFixed(1)}</div>
      <div>Spiele: ${gamesPlayed}</div>
      <div>PPG: ${ppg}</div>
    `;
    container.appendChild(card);
  });
}

// Matchups rendern
function renderMatchups() {
  const container = document.getElementById("matchups");
  if (!container || !matchups.length) return;

  container.innerHTML = "";

  matchups.forEach(m => {
    const div = document.createElement("div");
    div.classList.add("matchup-card");

    const home = rosters.find(r => r.roster_id === m.home_id);
    const away = rosters.find(r => r.roster_id === m.away_id);

    const homeOwner = ownerMap[home?.owner_id] || "-";
    const awayOwner = ownerMap[away?.owner_id] || "-";

    div.innerHTML = `
      <div class="matchup-team"><strong>${homeOwner}</strong> - ${m.home_score?.toFixed(1) ?? "-"}</div>
      <div class="matchup-team"><strong>${awayOwner}</strong> - ${m.away_score?.toFixed(1) ?? "-"}</div>
    `;
    container.appendChild(div);
  });
}

// League Ranking rendern (einfach nach Total Points)
async function renderLeagueRanking() {
  const container = document.getElementById("league-ranking");
  if (!container) return;

  container.innerHTML = "";

  const stats = await fetchSeasonStats();

  const ranking = rosters.map(r => {
    let totalPoints = 0;
    r.players.forEach(pid => {
      const s = stats[pid];
      if (s) totalPoints += s.pts_ppr ?? 0;
    });
    return {
      owner: ownerMap[r.owner_id] || "-",
      points: totalPoints
    };
  });

  ranking.sort((a, b) => b.points - a.points);

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Rang</th>
        <th>Team</th>
        <th>Punkte</th>
      </tr>
    </thead>
    <tbody>
      ${ranking.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.owner}</td>
          <td>${r.points.toFixed(1)}</td>
        </tr>
      `).join("")}
    </tbody>
  `;
  container.appendChild(table);
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  await loadRosters();
  await loadMatchups();
  await renderSeasonCards();
  renderMatchups();
  renderLeagueRanking();
});
