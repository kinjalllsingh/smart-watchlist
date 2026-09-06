async function loadWatchlist() {
    const res = await fetch("/api/watchlist");
    const items = await res.json();
    const container = document.getElementById("watchlist");
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Your watchlist is empty. Add a stock above to start tracking it.
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "stock-card" + (item.meaningful ? " highlight" : "");

        let changeText = "New — no history yet";
        if (item.change_pct !== null) {
            const arrow = item.change_pct >= 0 ? "▲" : "▼";
            changeText = `${arrow} ${item.change_pct}% since last check`;
        }

        div.innerHTML = `
            <strong>${item.symbol}</strong>
            <span>₹${item.price}</span>
            <span class="change">${changeText}</span>
            <button onclick="removeStock('${item.symbol}')">Remove</button>
        `;
        container.appendChild(div);
    });
}
async function addStock() {
    const input = document.getElementById("symbol-input");
    const symbol = input.value.trim();
    if (!symbol) return;
    await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol })
    });
    input.value = "";
    loadWatchlist();
}

async function removeStock(symbol) {
    await fetch(`/api/watchlist/${symbol}`, { method: "DELETE" });
    loadWatchlist();
}

loadWatchlist();
setInterval(loadWatchlist, 15000);