const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

// 💅 Geld formatieren
function formatMoney(amount) {
  return "$" + amount.toLocaleString("de-DE");
}

// 📊 Alle Auktionen laden
async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("auction_players")
    .select("*");

  console.log("DATA:", data);
  console.log("ERROR:", error);

  if (data) renderTable(data);
}

// 🎨 Tabelle rendern
function renderTable(players) {
  const table = document.getElementById("playersTable");
  table.innerHTML = "";

  players.forEach(p => {
    const row = `
      <tr>
        <td>${p.name}</td>
        <td>${formatMoney(p.current_bid)}</td>
        <td>${p.highest_bidder}</td>
      </tr>
    `;
    table.innerHTML += row;
  });
}

// 💸 Bieten / Spieler anlegen
window.bid = async function () {
  console.log("🔥 BID FUNCTION TRIGGERED");
  const player = document.getElementById("playerInput").value;
  const name = document.getElementById("name").value;
  const amount = parseInt(document.getElementById("amount").value);

  if (!player || !name || !amount) {
    alert("Bitte alle Felder ausfüllen");
    return;
  }

  // Prüfen ob Spieler existiert
  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("name", player)
    .maybeSingle();

  // 🆕 Neuer Spieler
  if (!existing) {
    await supabaseClient
      .from("auction_players")
      .insert({
        name: player,
        current_bid: amount,
        highest_bidder: name
      });

    return;
  }

  // ❌ Gebot zu niedrig
  if (amount <= existing.current_bid) {
    alert("Gebot muss höher sein als " + existing.current_bid);
    return;
  }

  // 🔄 Update
  await supabaseClient
    .from("auction_players")
    .update({
      current_bid: amount,
      highest_bidder: name
    })
    .eq("id", existing.id);
};

// 🔥 Realtime Updates
supabaseClient
  .channel("auction_players")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "auction_players" },
    () => {
      loadPlayers();
    }
  )
  .subscribe();

// 🚀 Start
loadPlayers();
