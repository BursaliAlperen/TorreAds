from flask import Flask, request, jsonify, g, render_template, send_from_directory
import sqlite3
import os

app = Flask(__name__, static_folder="static", template_folder="templates")

DATABASE = os.getenv("DATABASE_PATH", "balances.db")

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

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/odul", methods=["POST"])
def odul():
    data = request.get_json(force=True)
    uid = data.get("uid")
    miktar = float(data.get("miktar", 0))
    if not uid or miktar <= 0:
        return jsonify(error="Geçersiz veri"), 400

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
    return jsonify(message="Bakiye güncellendi", uid=uid, yeni_bakiye=yeni_bakiye)

@app.route("/api/bakiye/<uid>")
def bakiye(uid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (uid,))
    row = cur.fetchone()
    bakiye = row[0] if row else 0
    return jsonify(uid=uid, bakiye=bakiye)

@app.route("/<path:path>")
def static_proxy(path):
    return send_from_directory('static', path)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
