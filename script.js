const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

// 💰 Format
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

// 📊 Daten laden
async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("auction_players")
    .select("*");

  console.log("LOAD:", data, error);

  if (data) renderTable(data);
}

// 🎨 Tabelle rendern
function renderTable(players) {
  const table = document.getElementById("playersTable");
  table.innerHTML = "";

  players.forEach(p => {
    table.innerHTML += `
      <tr>
        <td>${p.player}</td>
        <td>${formatMoney(p.current_bid)}</td>
        <td>${p.highest_bidder || "-"}</td>
      </tr>
    `;
  });
}

// 💸 BID LOGIK
async function bid() {
  const playerName = document.getElementById("playerInput").value.trim();
  const bidderName = document.getElementById("bidderInput").value.trim();
  const amount = parseInt(document.getElementById("amountInput").value);

  if (!playerName || !bidderName || !amount) {
    alert("Bitte alle Felder ausfüllen");
    return;
  }

  // Spieler suchen
  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player", playerName)
    .maybeSingle();

  // 🆕 neu
  if (!existing) {
    const { error } = await supabaseClient
      .from("auction_players")
      .insert({
        player: playerName,
        current_bid: amount,
        highest_bidder: bidderName
      });

    console.log("INSERT ERROR:", error);
    return;
  }

  // ❌ zu niedrig
  if (amount <= existing.current_bid) {
    alert("Gebot muss höher sein als " + existing.current_bid);
    return;
  }

  // 🔄 update
  const { error } = await supabaseClient
    .from("auction_players")
    .update({
      current_bid: amount,
      highest_bidder: bidderName
    })
    .eq("id", existing.id);

  console.log("UPDATE ERROR:", error);
}

// 🔘 Button Event
document.getElementById("bidBtn").addEventListener("click", bid);

// 🔥 REATIME (wichtig!)
supabaseClient
  .channel("auction_players")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "auction_players"
    },
    (payload) => {
      console.log("REALTIME EVENT:", payload);
      loadPlayers();
    }
  )
  .subscribe();

// 🚀 Start
loadPlayers();
