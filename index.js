// ----------------------------
// Owner Map (Roster ID → Owner Name)
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

// ----------------------------
// Helper: Werte parsen
const parseValue = str => {
  if (!str) return 0;
  const num = str.toString().replace(/[^0-9]/g, '');
  return parseInt(num) || 0;
};

// ----------------------------
// Helper: Formatieren als $10.000.000
const formatMoney = value => {
  return "$" + Math.abs(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// ----------------------------
// Daten laden
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

async function fetchSleeperPlayers() {
  const res = await fetch("https://api.sleeper.app/v1/players/nfl");
  return await res.json();
}

// ----------------------------
// Team Cap Block rendern (UNVERÄNDERT)
async function renderTeamCapBlock() {
  const sheetData = await fetchSheetPlayers();
  const cutSheetData = await fetchCutSheet();
  const rosters = await fetchRosters();
  const teamCap = 160000000;

  const allYears = sheetData.flatMap(p => Object.keys(p).filter(k => /^\d{4}$/.test(k)));
  const yearCols = [...new Set(allYears)].sort();
  const year = yearCols[0] || "2025";

  let container = document.getElementById("team-cap-block");
  if (!container) {
    container = document.createElement("div");
    container.id = "team-cap-block";
    container.style.width = "100%";
    container.style.backgroundColor = "#1b2a3a";
    container.style.padding = "15px";
    container.style.borderRadius = "8px";
    container.style.marginBottom = "20px";
    container.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    container.style.border = "1px solid #162332";
    container.style.color = "#ffffff";
    container.style.fontFamily = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.4";
    container.style.overflowX = "hidden";
    container.style.boxSizing = "border-box";

    const dashboard = document.querySelector("h1");
    dashboard.parentNode.insertBefore(container, dashboard.nextSibling);
  }
  container.innerHTML = "";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.fontWeight = "600";
  header.style.backgroundColor = "#162332";
  header.style.padding = "6px 12px";
  header.style.borderRadius = "6px";
  header.style.marginBottom = "8px";
  header.style.gap = "8px";
  header.innerHTML = `
    <span style="flex:1.5">Owner</span>
    <span style="flex:1; text-align:right">Team Cap Space</span>
    <span style="flex:1; text-align:right">FAAB</span>
  `;
  container.appendChild(header);

  rosters.forEach((roster, index) => {
    const owner = ownerMap[String(roster.roster_id)] || "Unknown";
    const allIds = (roster.players || []).map(String);
    const taxiIds = (roster.taxi || []).map(String);
    const irIds = (roster.reserve || []).map(String);
    const activeIds = allIds.filter(id => !taxiIds.includes(id) && !irIds.includes(id));
    const activePlayers = activeIds.map(id => sheetData.find(p => String(p["Player ID"]) === id)).filter(Boolean);
    const deadCapPlayers = cutSheetData.filter(p => p.Owner === owner);

    const sumForYear = players => players.reduce((sum, p) => sum + parseValue(p[year]), 0);
    const capSpace = teamCap - sumForYear(activePlayers) - sumForYear(deadCapPlayers);
    const faab = Math.floor(capSpace / 10000);

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "8px";
    row.style.padding = "6px 12px";
    if (index % 2 === 0) row.style.backgroundColor = "#1f2b3d";

    row.innerHTML = `
      <span style="flex:1.5">${owner}</span>
      <span style="flex:1; text-align:right; color:${capSpace < 0 ? "#ff4d4d" : "#fff"}">${formatMoney(capSpace)}</span>
      <span style="flex:1; text-align:right; color:${faab < 0 ? "#ff4d4d" : "#fff"}">${faab}</span>
    `;
    container.appendChild(row);
  });
}

// ----------------------------
// Veteran Taxi Block rendern (FIXED)
async function renderVeteranTaxiBlock() {
  const sheetData = await fetchSheetPlayers();
  const rosters = await fetchRosters();
  const sleeperPlayers = await fetchSleeperPlayers();
  const taxiPlayers = [];

  rosters.forEach(roster => {
    const owner = ownerMap[String(roster.roster_id)] || "Unknown";
    const taxiIds = (roster.taxi || []).map(String);

    taxiIds.forEach(id => {
      const sheetPlayer = sheetData.find(p => String(p["Player ID"]).trim() === id);
      const sleeperPlayer = sleeperPlayers[id];

      if (!sheetPlayer || !sleeperPlayer) return;

      if (sheetPlayer.Contract?.toLowerCase() === "veteran") {
        taxiPlayers.push({
          Name: sleeperPlayer.full_name,
          Position: sleeperPlayer.position,
          Contract: sheetPlayer.Contract,
          owner
        });
      }
    });
  });

  let container = document.getElementById("veteran-taxi-block");
  if (!container) {
    container = document.createElement("div");
    container.id = "veteran-taxi-block";
    container.style.width = "100%";
    container.style.backgroundColor = "#1b2a3a";
    container.style.padding = "15px";
    container.style.borderRadius = "8px";
    container.style.marginBottom = "20px";
    container.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    container.style.border = "1px solid #162332";
    container.style.color = "#ffffff";
    container.style.fontFamily = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.4";
    container.style.overflowX = "hidden";
    container.style.boxSizing = "border-box";

    document.getElementById("team-cap-block")
      .parentNode.insertBefore(container, document.getElementById("team-cap-block").nextSibling);
  }

  container.innerHTML = `
  <!-- Überschrift -->
  <h2 style="
    margin: 0 0 12px 0;
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
  ">
    Veteran on Taxi
  </h2>

  <!-- Tabellen-Header -->
  <div style="display:flex;font-weight:600;background:#162332;padding:6px 12px;border-radius:6px;margin-bottom:8px">
    <span style="flex:2">Player</span>
    <span style="flex:1">Position</span>
    <span style="flex:1">Owner</span>
    <span style="flex:1">Contract</span>
  </div>
`;


  if (!taxiPlayers.length) {
    container.innerHTML += `<div style="padding:6px 12px;color:#bbb">Keine Veteran-Taxi-Spieler vorhanden.</div>`;
    return;
  }

  taxiPlayers.forEach((p, i) => {
    container.innerHTML += `
      <div style="display:flex;padding:6px 12px;${i % 2 === 0 ? "background:#1f2b3d" : ""}">
        <span style="flex:2">${p.Name}</span>
        <span style="flex:1">${p.Position}</span>
        <span style="flex:1">${p.owner}</span>
        <span style="flex:1">${p.Contract}</span>
      </div>
    `;
  });
}

// ----------------------------
// Players without Contract
async function renderPlayersWithoutContractBlock() {
  const sheetData = await fetchSheetPlayers();
  const rosters = await fetchRosters();
  const sleeperPlayers = await fetchSleeperPlayers();

  const playersWithoutContract = [];

  const yearCols = [
    ...new Set(
      sheetData.flatMap(p =>
        Object.keys(p).filter(k => /^\d{4}$/.test(k))
      )
    )
  ].sort();

  rosters.forEach(roster => {
    const owner = ownerMap[String(roster.roster_id)] || "Unknown";
    const allIds = (roster.players || []).map(String);

    allIds.forEach(id => {
      const sheetPlayer = sheetData.find(
        p => String(p["Player ID"]).trim() === id
      );

      const sleeperPlayer = sleeperPlayers[id];
      if (!sleeperPlayer) return;

      // Spieler steht gar nicht im Sheet
      if (!sheetPlayer) {
        playersWithoutContract.push({
          Name: sleeperPlayer.full_name,
          Position: sleeperPlayer.position || "-",
          Owner: owner,
          Grund: "Nicht im Sheet"
        });
        return;
      }

      // Spieler steht im Sheet, hat aber in keiner Jahres-Spalte Gehalt
      const hasSalary = yearCols.some(year => {
        return parseValue(sheetPlayer[year]) > 0;
      });

      if (!hasSalary) {
        playersWithoutContract.push({
          Name: sleeperPlayer.full_name,
          Position: sleeperPlayer.position || "-",
          Owner: owner,
          Grund: "Kein Gehalt"
        });
      }
    });
  });

  let container = document.getElementById("players-without-contract-block");

  if (!container) {
    container = document.createElement("div");
    container.id = "players-without-contract-block";
    container.style.width = "100%";
    container.style.backgroundColor = "#1b2a3a";
    container.style.padding = "15px";
    container.style.borderRadius = "8px";
    container.style.marginBottom = "20px";
    container.style.boxShadow = "0 4px 10px rgba(0,0,0,0.4)";
    container.style.border = "1px solid #162332";
    container.style.color = "#ffffff";
    container.style.fontFamily = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
    container.style.fontSize = "14px";
    container.style.lineHeight = "1.4";
    container.style.boxSizing = "border-box";

    document
      .getElementById("veteran-taxi-block")
      .parentNode.insertBefore(
        container,
        document.getElementById("veteran-taxi-block").nextSibling
      );
  }

  container.innerHTML = `
    <h2 style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#ffffff;">
      Spieler ohne Vertrag
    </h2>

    <div style="display:flex;font-weight:600;background:#162332;padding:6px 12px;border-radius:6px;margin-bottom:8px">
      <span style="flex:2">Player</span>
      <span style="flex:1">Position</span>
      <span style="flex:1">Owner</span>
      <span style="flex:1">Grund</span>
    </div>
  `;

  if (!playersWithoutContract.length) {
    container.innerHTML += `
      <div style="padding:6px 12px;color:#bbb">
        Alle Roster-Spieler haben ein Gehalt.
      </div>
    `;
    return;
  }

  playersWithoutContract.forEach((p, i) => {
    container.innerHTML += `
      <div style="display:flex;padding:6px 12px;${i % 2 === 0 ? "background:#1f2b3d" : ""}">
        <span style="flex:2">${p.Name}</span>
        <span style="flex:1">${p.Position}</span>
        <span style="flex:1">${p.Owner}</span>
        <span style="flex:1">${p.Grund}</span>
      </div>
    `;
  });
}

// ----------------------------
// Laden
document.addEventListener("DOMContentLoaded", async () => {
  await renderTeamCapBlock();  // Warten, bis Team-Cap-Block komplett aufgebaut ist
  await renderVeteranTaxiBlock(); // dann Veteran-Taxi-Block
  await renderPlayersWithoutContractBlock(); // dann Players Without Contract Block
});



