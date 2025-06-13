from flask import Flask, request, jsonify, g
import sqlite3
import os

DATABASE = os.getenv("DATABASE_PATH", "balances.db")

app = Flask(__name__)

def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
        db.execute("CREATE TABLE IF NOT EXISTS balances (uid TEXT PRIMARY KEY, bakiye REAL NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS referrals (uid TEXT PRIMARY KEY, referrer TEXT)")
        db.commit()
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

@app.route("/api/bakiye/<uid>")
def bakiye(uid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()
    bakiye = row["bakiye"] if row else 0.0
    return jsonify(uid=uid, bakiye=bakiye)

@app.route("/api/kazandir", methods=["POST"])
def kazandir():
    data = request.get_json(force=True)
    uid = data.get("uid")
    referrer = data.get("referrer")
    miktar = 0.0001

    if not uid:
        return jsonify(success=False, error="UID eksik"), 400

    db = get_db()
    cur = db.cursor()

    # Kendi bakiyesini artır
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()
    if row:
        yeni_bakiye = row["bakiye"] + miktar
        cur.execute("UPDATE balances SET bakiye = ? WHERE uid = ?", (yeni_bakiye, uid))
    else:
        yeni_bakiye = miktar
        cur.execute("INSERT INTO balances(uid, bakiye) VALUES(?, ?)", (uid, yeni_bakiye))

    # Eğer daha önce referansı yoksa kaydet ve ödül ver
    if referrer and referrer != uid:
        cur.execute("SELECT referrer FROM referrals WHERE uid = ?", (uid,))
        already = cur.fetchone()
        if not already:
            cur.execute("INSERT INTO referrals(uid, referrer) VALUES(?, ?)", (uid, referrer))

            # Referrera ödül ver
            cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (referrer,))
            ref_row = cur.fetchone()
            if ref_row:
                ref_yeni = ref_row["bakiye"] + miktar
                cur.execute("UPDATE balances SET bakiye = ? WHERE uid = ?", (ref_yeni, referrer))
            else:
                cur.execute("INSERT INTO balances(uid, bakiye) VALUES(?, ?)", (referrer, miktar))

    db.commit()
    return jsonify(success=True, uid=uid, yeni_bakiye=yeni_bakiye)

@app.route("/")
def index():
    return jsonify(ok=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
