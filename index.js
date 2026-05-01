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
// Team Cap Block
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

```
container.style.backgroundColor = "#f2e9dc";
container.style.color = "#2f2419";
container.style.border = "1px solid #dccbb2";
container.style.boxShadow = "0 4px 10px rgba(120, 90, 50, 0.12)";

container.style.padding = "15px";
container.style.borderRadius = "8px";
container.style.marginBottom = "20px";

const dashboard = document.querySelector("h1");
dashboard.parentNode.insertBefore(container, dashboard.nextSibling);
```

}

container.innerHTML = "";

const header = document.createElement("div");
header.style.display = "flex";
header.style.fontWeight = "600";
header.style.backgroundColor = "#e6d8c3";
header.style.padding = "6px 12px";
header.style.borderRadius = "6px";
header.style.marginBottom = "8px";

header.innerHTML = `     <span style="flex:1.5">Owner</span>     <span style="flex:1; text-align:right">Cap Space</span>     <span style="flex:1; text-align:right">FAAB</span>
  `;
container.appendChild(header);

rosters.forEach((roster, index) => {
const owner = ownerMap[String(roster.roster_id)] || "Unknown";

```
const row = document.createElement("div");
row.style.display = "flex";
row.style.padding = "6px 12px";

if (index % 2 === 0) row.style.backgroundColor = "#f6efe4";

row.innerHTML = `
  <span style="flex:1.5">${owner}</span>
  <span style="flex:1; text-align:right;">-</span>
  <span style="flex:1; text-align:right;">-</span>
`;
container.appendChild(row);
```

});
}

// ----------------------------
// Blocks laden
document.addEventListener("DOMContentLoaded", async () => {
await renderTeamCapBlock();
});
