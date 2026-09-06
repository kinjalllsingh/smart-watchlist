function colorForSymbol(symbol) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) {
        hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 62%)`;
}

async function loadWatchlist() {
    const res = await fetch("/api/watchlist");
    const items = await res.json();
    const container = document.getElementById("watchlist");
    container.innerHTML = "";

    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                Your watchlist is empty — add a symbol above to start tracking it.
            </div>
        `;
        return;
    }

    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "stock-row" + (item.meaningful ? " meaningful" : "");

        let changeHTML = `<span class="change neutral">New — no history yet</span>`;
        if (item.stale) {
            changeHTML = `<span class="change neutral">No new data since last check</span>`;
        } else if (item.change_pct !== null) {
            const dir = item.change_pct >= 0 ? "up" : "down";
            const arrow = item.change_pct >= 0 ? "▲" : "▼";
            changeHTML = `<span class="change ${dir}">${arrow} ${item.change_pct}% since last check</span>`;
        }

        const staleTag = item.stale ? `<span class="stale-tag">⚠ delayed</span>` : "";
        const avatarColor = colorForSymbol(item.symbol);
        const initials = item.symbol.slice(0, 2);

        div.innerHTML = `
            <div class="avatar" style="background:${avatarColor}; --ring-color:${avatarColor};">${initials}</div>
            <div class="info">
                <div class="symbol">${item.symbol}</div>
                <div class="meta-line">
                    <span class="price">₹${item.price}</span>
                    ${changeHTML}
                    ${staleTag}
                </div>
            </div>
            <button class="remove-btn" onclick="removeStock('${item.symbol}')">×</button>
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

document.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && document.activeElement.id === "symbol-input") {
        addStock();
    }
});

loadWatchlist();
setInterval(loadWatchlist, 15000);