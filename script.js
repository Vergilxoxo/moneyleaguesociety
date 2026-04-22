const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

// 💰 Format
function formatMoney(amount) {
  return "$" + Number(amount || 0).toLocaleString("de-DE");
}

// 📊 Laden
async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("auction_players")
    .select("*");

  console.log("LOAD:", data, error);

  if (data) renderTable(data);
}

// 🎨 Tabelle
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

// 💸 Bieten
async function bid() {
  const playerName = document.getElementById("playerInput").value;
  const bidderName = document.getElementById("bidderInput").value;
  const amount = parseInt(document.getElementById("amountInput").value);

  if (!playerName || !bidderName || !amount) {
    alert("Bitte alles ausfüllen");
    return;
  }

  // Spieler holen
  const { data: existing, error } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player", playerName)
    .maybeSingle();

  console.log("EXISTING:", existing, error);

  // 🆕 neu anlegen
  if (!existing) {
    const { error: insertError } = await supabaseClient
      .from("auction_players")
      .insert({
        player: playerName,
        current_bid: amount,
        highest_bidder: bidderName
      });

    console.log("INSERT ERROR:", insertError);
    return;
  }

  // ❌ zu niedrig
  if (amount <= existing.current_bid) {
    alert("Gebot muss höher sein als " + existing.current_bid);
    return;
  }

  // 🔄 update
  const { error: updateError } = await supabaseClient
    .from("auction_players")
    .update({
      current_bid: amount,
      highest_bidder: bidderName
    })
    .eq("id", existing.id);

  console.log("UPDATE ERROR:", updateError);
}

// 🔥 Button Event (sauber statt onclick)
document.getElementById("bidBtn").addEventListener("click", bid);

// 🚀 Start
loadPlayers();
