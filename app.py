from flask import Flask, request, jsonify, g
import sqlite3
import os
from datetime import datetime, timedelta

DATABASE = os.getenv("DATABASE_PATH", "balances.db")
REWARD_AMOUNT = 0.0001
REWARD_COOLDOWN_SECONDS = 18  # aynı kullanıcı 18 saniyede bir ödül alabilir

app = Flask(__name__)

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("""
            CREATE TABLE IF NOT EXISTS balances (
                uid TEXT PRIMARY KEY,
                bakiye REAL NOT NULL,
                last_claim TIMESTAMP
            )
        """)
        db.commit()
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

@app.route("/api/odul", methods=["POST"])
def odul():
    data = request.get_json(force=True)
    uid = data.get("uid")
    if not uid:
        return jsonify(success=False, message="Kullanıcı ID eksik"), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye, last_claim FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()

    now = datetime.utcnow()

    if row:
        # Son ödül alma zamanına göre kontrol
        last_claim = datetime.strptime(row["last_claim"], "%Y-%m-%d %H:%M:%S") if row["last_claim"] else None
        if last_claim and (now - last_claim) < timedelta(seconds=REWARD_COOLDOWN_SECONDS):
            kalan = REWARD_COOLDOWN_SECONDS - int((now - last_claim).total_seconds())
            return jsonify(success=False, message=f"{kalan} saniye sonra tekrar deneyin"), 429

        yeni_bakiye = row["bakiye"] + REWARD_AMOUNT
        cur.execute("UPDATE balances SET bakiye = ?, last_claim = ? WHERE uid = ?", (yeni_bakiye, now, uid))
    else:
        yeni_bakiye = REWARD_AMOUNT
        cur.execute("INSERT INTO balances(uid, bakiye, last_claim) VALUES (?, ?, ?)", (uid, yeni_bakiye, now))

    db.commit()
    return jsonify(success=True, uid=uid, yeni_bakiye=yeni_bakiye)

@app.route("/api/bakiye/<uid>")
def bakiye(uid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()
    bakiye = row["bakiye"] if row else 0
    return jsonify(uid=uid, bakiye=bakiye)

@app.route("/")
def index():
    return jsonify(ok=True, timestamp=time_now())

def time_now():
    return datetime.utcnow().isoformat() + "Z"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=False)
