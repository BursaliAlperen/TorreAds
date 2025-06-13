from flask import Flask, request, jsonify, g
import sqlite3
import os
from datetime import datetime

DATABASE = os.getenv("DATABASE_PATH", "balances.db")

app = Flask(__name__)

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.execute(
            "CREATE TABLE IF NOT EXISTS balances (uid TEXT PRIMARY KEY, bakiye REAL NOT NULL)"
        )
        db.commit()
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

@app.route("/api/reward", methods=["POST"])
def reward():
    data = request.get_json(force=True)
    uid = data.get("token")  # token ile user id aldık
    miktar = 0.0001  # Sabit ödül miktarı

    if not uid:
        return jsonify(success=False, message="Geçersiz kullanıcı token"), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()

    if row:
        yeni_bakiye = row[0] + miktar
        cur.execute("UPDATE balances SET bakiye = ? WHERE uid = ?", (yeni_bakiye, uid))
    else:
        yeni_bakiye = miktar
        cur.execute("INSERT INTO balances(uid, bakiye) VALUES(?, ?)", (uid, yeni_bakiye))
    db.commit()

    return jsonify(success=True, yeni_bakiye=yeni_bakiye)

@app.route("/api/balance/<uid>")
def balance(uid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()
    bakiye = row[0] if row else 0
    return jsonify(uid=uid, bakiye=bakiye)

@app.route("/")
def index():
    return jsonify(ok=True, timestamp=datetime.utcnow().isoformat() + "Z")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
    

// Rewarded Popup

show_9441902('pop').then(() => {
    // user watch ad till the end or close it in interstitial format
    // your code to reward user for rewarded format
}).catch(e => {
    // user get error during playing ad
    // do nothing or whatever you want
})

        
