async function loadRulebook() {
  const res = await fetch(
    "https://opensheet.elk.sh/1TmZedqXNrEZ-LtPxma7AemFsKOoHErFgZhjIOK3C0hc/Regelwerk"
  );
  const rows = await res.json();

  const container = document.getElementById("docs-content");
  let currentTable = null; // <- Hier draußen, damit es zwischen Zeilen erhalten bleibt

  rows
    .sort((a, b) => Number(a.order) - Number(b.order))
    .forEach(row => {
      let el;

      switch (row.type) {
        case "h1":
          el = document.createElement("h1");
          el.className = "docs-h1";
          el.textContent = row.content;
          container.appendChild(el);
          break;

        case "h2":
          el = document.createElement("h2");
          el.className = "docs-h2";
          el.textContent = row.content;
          container.appendChild(el);
          break;

        case "h3":
          el = document.createElement("h3");
          el.className = "docs-h3";
          el.textContent = row.content;
          container.appendChild(el);
          break;

        case "p":
          el = document.createElement("p");
          el.className = "docs-p";
          el.textContent = row.content;
          container.appendChild(el);
          break;

        case "link":
          el = document.createElement("a");
          el.className = "docs-link";
          el.href = row.content;
          el.target = "_blank";
          el.rel = "noopener noreferrer";
          el.textContent = row.content;
          container.appendChild(el);
          break;

        case "ul":
          el = document.createElement("ul");
          el.className = "docs-ul";
          el.innerHTML = row.content
            .split("|")
            .map(i => `<li>${i.trim()}</li>`)
            .join("");
          container.appendChild(el);
          break;

        case "ol":
          el = document.createElement("ol");
          el.className = "docs-ol";
          el.innerHTML = row.content
            .split("|")
            .map(i => `<li>${i.trim()}</li>`)
            .join("");
          container.appendChild(el);
          break;

        case "table_start":
          currentTable = document.createElement("table");
          currentTable.className = "docs-table";
        
          if (row.columns) {
            const thead = document.createElement("thead");
            const tr = document.createElement("tr");
        
            // Spalten sauber splitten und trimmen
            row.columns.split("|").forEach(h => {
              const th = document.createElement("th");
              th.textContent = h.trim();
              th.style.backgroundColor = "#162332";  // Darkmode Header
              th.style.color = "#ffffff";
              th.style.fontWeight = "600";
              th.style.padding = "10px";
              th.style.textAlign = "left";
              th.style.borderBottom = "1px solid #223348";
              tr.appendChild(th);
            });
        
            thead.appendChild(tr);
            currentTable.appendChild(thead);
          }
        
          // tbody hinzufügen
          currentTable.appendChild(document.createElement("tbody"));
          container.appendChild(currentTable);
          break;


          case "table_row":
            if (!currentTable) return;
            const tr = document.createElement("tr");
            row.content.split("|").forEach(c => {
              const td = document.createElement("td");
              td.textContent = c.trim();
              tr.appendChild(td);
            });
            currentTable.querySelector("tbody").appendChild(tr);
            break;

            case "table_end":
              currentTable = null;
              break;

        default:
          return;
      }
    });
}

document.addEventListener("DOMContentLoaded", loadRulebook);
