from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

DB_PATH = 'veritabani.db'

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                balance REAL DEFAULT 0
            )
        ''')
        conn.commit()

init_db()

@app.route("/api/bakiye/<uid>")
def bakiye(uid):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT balance FROM users WHERE uid = ?", (uid,))
        row = c.fetchone()
        if row:
            return jsonify({"bakiye": row[0]})
        else:
            # Kullanıcı yoksa oluştur ve 0 bakiye dön
            c.execute("INSERT INTO users (uid, balance) VALUES (?, 0)", (uid,))
            conn.commit()
            return jsonify({"bakiye": 0})

@app.route("/api/odul", methods=["POST"])
def odul():
    data = request.get_json()
    uid = data.get("uid")
    miktar = float(data.get("miktar", 0))

    if not uid or miktar <= 0:
        return jsonify({"error": "Geçersiz veri"}), 400

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("SELECT balance FROM users WHERE uid = ?", (uid,))
        row = c.fetchone()

        if row:
            yeni_bakiye = row[0] + miktar
            c.execute("UPDATE users SET balance = ? WHERE uid = ?", (yeni_bakiye, uid))
        else:
            yeni_bakiye = miktar
            c.execute("INSERT INTO users (uid, balance) VALUES (?, ?)", (uid, yeni_bakiye))

        conn.commit()
        return jsonify({"success": True, "yeni_bakiye": yeni_bakiye})

@app.route("/api/sifirla/<uid>", methods=["POST"])
def sifirla(uid):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute("UPDATE users SET balance = 0 WHERE uid = ?", (uid,))
        conn.commit()
        return jsonify({"success": True, "yeni_bakiye": 0})

if __name__ == "__main__":
    app.run(debug=True)
