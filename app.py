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
    import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

TELEGRAM_BOT_TOKEN = "7574066753:AAFkvZzqnZTNZcLEFKzLAmYyyppIBPNUeaM"
TELEGRAM_CHAT_ID = "7904032877"

def send_telegram_message(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    response = requests.post(url, json=payload)
    return response.ok

@app.route("/api/request_withdraw", methods=["POST"])
def request_withdraw():
    data = request.get_json(force=True)
    user_token = data.get("userToken")

    if not user_token:
        return jsonify({"success": False, "error": "userToken gerekli"}), 400

    msg = f"Yeni çekim talebi!\nUser Token: <code>{user_token}</code>"
    send_telegram_message(msg)

    return jsonify({"success": True, "message": "Çekim talebi iletildi. Lütfen bakiye sıfırlayın."})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
import requests
import sqlite3
from flask import Flask, request, jsonify, g
import os

DATABASE = os.getenv("DATABASE_PATH", "balances.db")

app = Flask(__name__)

TELEGRAM_BOT_TOKEN = "7574066753:AAFkvZzqnZTNZcLEFKzLAmYyyppIBPNUeaM"
TELEGRAM_CHAT_ID = "7904032877"

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

def send_telegram_message(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    response = requests.post(url, json=payload)
    return response.ok

@app.route("/api/request_withdraw", methods=["POST"])
def request_withdraw():
    data = request.get_json(force=True)
    user_token = data.get("userToken")

    if not user_token:
        return jsonify({"success": False, "error": "userToken gerekli"}), 400

    # Telegram mesajı gönder
    msg = f"Yeni çekim talebi!\nUser Token: <code>{user_token}</code>"
    send_telegram_message(msg)

    # Bakiyeyi sıfırla
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE balances SET bakiye = 0 WHERE uid = ?", (user_token,))
    db.commit()

    return jsonify({"success": True, "message": "Çekim talebi iletildi ve bakiye sıfırlandı."})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
import requests

TELEGRAM_TOKEN = "7574066753:AAFkvZzqnZTNZcLEFKzLAmYyyppIBPNUeaM"
CHAT_ID = "7904032877"

def send_telegram_message(text):
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {"chat_id": CHAT_ID, "text": text}
    requests.post(url, data=payload)

@app.route("/api/reward", methods=["POST"])
def reward():
    data = request.get_json(force=True)
    user_token = data.get("userToken")
    if not user_token:
        return jsonify({"success": False, "error": "userToken gerekli"}), 400

    REWARD_AMOUNT = 0.0001

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (user_token,))
    row = cur.fetchone()

    if row:
        new_balance = row[0] + REWARD_AMOUNT
        cur.execute("UPDATE balances SET bakiye = ? WHERE uid = ?", (new_balance, user_token))
    else:
        new_balance = REWARD_AMOUNT
        cur.execute("INSERT INTO balances(uid, bakiye) VALUES (?, ?)", (user_token, new_balance))

    db.commit()
    return jsonify({"success": True, "newBalance": new_balance})


@app.route("/api/request_withdraw", methods=["POST"])
def request_withdraw():
    data = request.get_json(force=True)
    user_token = data.get("userToken")
    if not user_token:
        return jsonify({"success": False, "error": "userToken gerekli"}), 400

    MIN_WITHDRAW = 0.5

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT bakiye FROM balances WHERE uid = ?", (user_token,))
    row = cur.fetchone()

    if not row:
        return jsonify({"success": False, "error": "Kullanıcı bulunamadı"}), 404

    current_balance = row[0]

    if current_balance < MIN_WITHDRAW:
        return jsonify({"success": False, "error": f"Minimum çekim tutarı {MIN_WITHDRAW} TON"}), 400

    # Telegram mesajı gönder
    send_telegram_message(f"Çekim talebi alındı.\nUser Token: {user_token}\nBakiye: {current_balance} TON")

    # Bakiye sıfırla
    cur.execute("UPDATE balances SET bakiye = 0 WHERE uid = ?", (user_token,))
    db.commit()

    return jsonify({"success": True, "message": "Çekim talebi başarılı, bakiye sıfırlandı."})
