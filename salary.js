// Sheet URLs (korrekte Tab-Namen, Leerzeichen als %20)
const sheets = {
  QB: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/QBSalary",
  RB: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/RBSalary",
  WR: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/WRSalary",
  TE: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/TESalary",
  DL: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/DLSalary",
  LB: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/LBSalary",
  DB: "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/DBSalary"
};

let currentData = []; // aktuell geladene Tabelle

// Tabelle rendern
function renderTable(data) {
  const tbody = document.querySelector("#salary-table tbody");
  tbody.innerHTML = "";

  data.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p["Player"] || "-"}</td>
      <td>${p["Salary"] || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Daten laden
async function loadSalary(position) {
  try {
    const res = await fetch(sheets[position]);
    const data = await res.json();
    currentData = data;
    renderTable(data);
  } catch (err) {
    console.error("Fehler beim Laden der Tabelle:", err);
    currentData = [];
    renderTable([]);
  }
}

// Filter Input
function setupFilter() {
  const searchInput = document.getElementById("search-input");

  searchInput.addEventListener("input", () => {
    const filter = searchInput.value.toLowerCase();

    document.querySelectorAll("#salary-table tbody tr").forEach((row, index) => {
      if (!currentData[index]) return;
      const playerName = currentData[index]["Player"].toLowerCase();
      row.style.display = playerName.includes(filter) ? "" : "none";
    });
  });
}

// Dropdown wechseln
function setupDropdown() {
  const select = document.getElementById("position-select");
  select.addEventListener("change", () => {
    loadSalary(select.value);
    document.getElementById("search-input").value = "";
  });
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  await loadSalary("QB");   // Standard: QB Tabelle laden
  setupDropdown();
  setupFilter();
});
