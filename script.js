const supabaseClient = window.supabase.createClient(
  "https://zsfheujopmzxsggvyqds.supabase.co",
  "sb_publishable_WSCtZyvff9GEsvlOo4Iazw_r6bA9m6p"
);

// GLOBAL verfügbar machen
window.bid = async function () {
  const name = document.getElementById("name").value;
  const amount = parseInt(document.getElementById("amount").value);

  await supabaseClient
    .from("auction")
    .update({
      current_bid: amount,
      highest_bidder: name
    })
    .eq("id", 1);
};

// Daten laden
async function loadAuction() {
  const { data, error } = await supabaseClient
    .from("auction")
    .select("*")
    .eq("id", 1)
    .single();

  console.log(data, error);

  if (data) updateUI(data);
}

// UI
function updateUI(data) {
  document.getElementById("player").innerText = data.player;
  document.getElementById("bid").innerText = data.current_bid;
  document.getElementById("bidder").innerText = data.highest_bidder;
}

// Realtime
supabaseClient
  .channel("auction")
  .on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "auction" },
    payload => {
      updateUI(payload.new);
    }
  )
  .subscribe();

loadAuction();