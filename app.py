from flask import Flask, request, jsonify, render_template
import sqlite3
import random
import time

app = Flask(__name__)
DB = "watchlist.db"

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT UNIQUE NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            price REAL NOT NULL,
            timestamp REAL NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

BASE_PRICES = {}

def get_current_price(symbol):
    is_stale = random.random() < 0.15

    if is_stale and symbol in BASE_PRICES:
        return round(BASE_PRICES[symbol], 2), True

    if symbol not in BASE_PRICES:
        BASE_PRICES[symbol] = random.uniform(100, 3000)

    BASE_PRICES[symbol] *= (1 + random.uniform(-0.03, 0.03))
    return round(BASE_PRICES[symbol], 2), False

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/watchlist", methods=["GET"])
def get_watchlist():
    conn = get_db()
    items = conn.execute("SELECT * FROM watchlist").fetchall()
    result = []
    for item in items:
        symbol = item["symbol"]
        current_price, is_stale = get_current_price(symbol)

        history = conn.execute(
            "SELECT * FROM snapshots WHERE symbol=? ORDER BY timestamp DESC LIMIT 6",
            (symbol,)
        ).fetchall()

        change_pct = None
        is_meaningful = False

        if history:
            last_price = history[0]["price"]
            change_pct = round(((current_price - last_price) / last_price) * 100, 2)

            past_changes = []
            for i in range(len(history) - 1):
                p_new = history[i]["price"]
                p_old = history[i + 1]["price"]
                past_changes.append(abs((p_new - p_old) / p_old) * 100)

            if len(past_changes) >= 2:
                avg_volatility = sum(past_changes) / len(past_changes)
                is_meaningful = abs(change_pct) > max(avg_volatility * 1.5, 0.5)
            else:
                is_meaningful = abs(change_pct) > 2

        if not is_stale:
            conn.execute(
                "INSERT INTO snapshots (symbol, price, timestamp) VALUES (?, ?, ?)",
                (symbol, current_price, time.time())
            )

        result.append({
            "symbol": symbol,
            "price": current_price,
            "change_pct": change_pct,
            "meaningful": is_meaningful,
            "stale": is_stale
        })

    conn.commit()
    conn.close()
    return jsonify(result)

@app.route("/api/watchlist", methods=["POST"])
def add_stock():
    symbol = request.json.get("symbol", "").upper().strip()
    if not symbol:
        return jsonify({"error": "symbol required"}), 400
    conn = get_db()
    try:
        conn.execute("INSERT INTO watchlist (symbol) VALUES (?)", (symbol,))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    conn.close()
    return jsonify({"status": "ok"})

@app.route("/api/watchlist/<symbol>", methods=["DELETE"])
def remove_stock(symbol):
    conn = get_db()
    conn.execute("DELETE FROM watchlist WHERE symbol=?", (symbol.upper(),))
    conn.commit()
    conn.close()
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True)