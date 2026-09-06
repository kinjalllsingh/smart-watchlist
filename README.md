# Smart Watchlist

A stock watchlist that goes beyond showing current prices — it tracks what has meaningfully changed since you last checked, so you don't have to re-scan every number to notice what matters.

## What it does

- Add and remove stocks from a watchlist
- View live (simulated) prices for each stock
- See a "since last check" change indicator for each stock
- Automatically highlights moves that are meaningful *for that specific stock* — not a flat threshold for everyone

## What counts as "meaningful" (and why)

Instead of flagging any move over a fixed percentage (e.g. "always highlight moves over 2%"), this app compares each stock's current move to **that stock's own recent average volatility**. A move is flagged as meaningful only if it's at least 1.5x larger than what's normal for that stock.

Why: a 2% move on a stock that barely moves day-to-day is a real signal. The same 2% move on a stock that regularly swings 4-5% is just noise. A flat threshold treats both the same and either over-alerts on volatile stocks or under-alerts on calm ones. Comparing each stock against its own baseline avoids both problems.

If a stock doesn't have enough price history yet (e.g. just added), the app falls back to a simple flat-percentage rule until enough data builds up.

## Architecture

- **Frontend**: plain HTML/CSS/JavaScript — a single page that polls the backend every 15 seconds and re-renders the watchlist.
- **Backend**: Python + Flask, exposing a small REST API (`GET/POST/DELETE /api/watchlist`).
- **Database**: SQLite — two tables: `watchlist` (which stocks are tracked) and `snapshots` (a price history log per stock, used to compute both the "since last check" change and the volatility baseline).
- **Price data**: simulated via a random-walk generator rather than a real market API. This was a deliberate choice — it avoids external rate limits and network flakiness so the demo is reliable, and it lets the "meaningful change" logic be tested predictably. Swapping in a real API would only require replacing `get_current_price()`.

## Edge cases handled

- **Empty watchlist**: shows a friendly message instead of a blank page.
- **Duplicate stock entries**: adding a stock symbol already on the list is silently ignored rather than erroring or creating a duplicate row.
- **Inconsistent input**: symbols are normalized (trimmed, uppercased) before being stored, so `" tcs "` and `"TCS"` are treated identically.
- **New stock with no history**: falls back to a flat-percentage rule instead of crashing on a missing baseline.

## What was deliberately left out (and why)

- **User accounts / multi-user separation**: the watchlist is currently global rather than per-user. Given the 72-hour scope, the interesting engineering problem here was the change-detection logic, not auth — so a single shared watchlist was chosen to keep the scope focused. Adding per-user watchlists would mean introducing a `user_id` column on both tables and a lightweight session/identifier, which is a small, well-understood extension.
- **Real-time push updates**: the frontend polls every 15 seconds rather than using WebSockets. Polling is simpler to reason about and sufficient for a watchlist use case where sub-second updates aren't the point.
- **Real market data**: simulated prices were used instead of a live API, as noted above, to keep the demo reliable within the time constraints.

## Running it locally

```
python3 -m venv venv
source venv/bin/activate
pip install flask
python3 app.py
```

Then open `http://127.0.0.1:5000` in a browser.