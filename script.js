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

  if (error) {
    console.log("LOAD ERROR:", error);
    return;
  }

  renderTable(data);
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
  const playerName = document.getElementById("playerInput").value.trim();
  const bidderName = document.getElementById("bidderInput").value.trim();
  const amount = parseInt(document.getElementById("amountInput").value);

  if (!playerName || !bidderName || !amount) {
    alert("Bitte alle Felder ausfüllen");
    return;
  }

  const { data: existing } = await supabaseClient
    .from("auction_players")
    .select("*")
    .eq("player", playerName)
    .maybeSingle();

  // 🆕 INSERT
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

  // 🔄 UPDATE
  const { error } = await supabaseClient
    .from("auction_players")
    .update({
      current_bid: amount,
      highest_bidder: bidderName
    })
    .eq("id", existing.id);

  document.getElementById("playerInput").value = "";
  document.getElementById("bidderInput").value = "";
  document.getElementById("amountInput").value = "";
  
  console.log("UPDATE ERROR:", error);
}

// 🔘 Button Event
document.getElementById("bidBtn").addEventListener("click", bid);

// 🔥 REALTIME (wenn aktiviert in Supabase)
supabaseClient
  .channel("auction_players_channel")
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

// 🔁 FALLBACK (wichtig!)
setInterval(() => {
  loadPlayers();
}, 3000);

// 🚀 Start
loadPlayers();
