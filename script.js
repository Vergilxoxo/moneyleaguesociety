const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);


// 💅 Geld formatieren
function formatMoney(amount) {
  return "$" + amount.toLocaleString("de-DE");
}

// 🔝 Aktiven Spieler laden
async function loadActivePlayer() {
  const { data, error } = await supabaseClient
    .from("players")
    .select("*")
    .eq("is_active", true)
    .single();

  if (data) updateUI(data);
}

// 🧾 Alle Spieler laden
async function loadPlayers() {
  const { data, error } = await supabaseClient
    .from("players")
    .select("*");

  if (data) renderTable(data);
}

// 🎨 UI oben
function updateUI(player) {
  document.getElementById("player").innerText = player.name;
  document.getElementById("bid").innerText = formatMoney(player.current_bid);
  document.getElementById("bidder").innerText = player.highest_bidder;
}

// 📊 Tabelle unten
function renderTable(players) {
  const table = document.getElementById("playersTable");
  table.innerHTML = "";

  players.forEach(p => {
    const status = p.is_active ? "🟢 Aktiv" : "⚪ Offen";

    const row = `
      <tr>
        <td>${p.name}</td>
        <td>${formatMoney(p.current_bid)}</td>
        <td>${p.highest_bidder}</td>
        <td>${status}</td>
      </tr>
    `;

    table.innerHTML += row;
  });
}

// 💸 Bieten
window.bid = async function () {
  const name = document.getElementById("name").value;
  const amount = parseInt(document.getElementById("amount").value);

  // Aktiven Spieler holen
  const { data } = await supabaseClient
    .from("players")
    .select("*")
    .eq("is_active", true)
    .single();

  const currentBid = data.current_bid;

  if (amount <= currentBid) {
    alert("Gebot muss höher sein als " + currentBid);
    return;
  }

  await supabaseClient
    .from("players")
    .update({
      current_bid: amount,
      highest_bidder: name
    })
    .eq("id", data.id);
};

// 🔥 Realtime Updates
supabaseClient
  .channel("players")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "players" },
    payload => {
      loadPlayers();

      if (payload.new.is_active) {
        updateUI(payload.new);
      }
    }
  )
  .subscribe();

// 🚀 Start
loadActivePlayer();
loadPlayers();
