from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_NAME = 'data.db'

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    if not os.path.exists(DB_NAME):
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ad_views (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT NOT NULL UNIQUE,
                total_views INTEGER DEFAULT 0,
                balance REAL DEFAULT 0
            )
        ''')
        conn.commit()
        conn.close()

@app.route('/api/reward', methods=['POST'])
def reward():
    data = request.get_json()
    token = data.get('token')

    if not token:
        return jsonify(success=False, message="❌ Token eksik."), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT total_views, balance FROM ad_views WHERE token = ?", (token,))
    row = cursor.fetchone()

    if row:
        total_views = row['total_views']
        balance = row['balance']
        if total_views >= 1000:
            conn.close()
            return jsonify(success=False, message="🚫 1000 reklam izleme sınırına ulaştınız."), 403

        total_views += 1
        balance += 0.0001
        cursor.execute("UPDATE ad_views SET total_views = ?, balance = ? WHERE token = ?", (total_views, balance, token))
    else:
        total_views = 1
        balance = 0.0001
        cursor.execute("INSERT INTO ad_views (token, total_views, balance) VALUES (?, ?, ?)", (token, total_views, balance))

    conn.commit()
    conn.close()

    return jsonify(success=True, message="🎉 0.0001 TON kazandınız!", balance=balance)

@app.route('/api/balance', methods=['GET'])
def get_balance():
    token = request.args.get('token')
    if not token:
        return jsonify(success=False, message="Token eksik."), 400
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT balance FROM ad_views WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return jsonify(success=True, balance=row['balance'])
    else:
        return jsonify(success=True, balance=0)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
from flask import Flask, request, jsonify, send_from_directory from datetime import datetime import sqlite3 import os

app = Flask(name, static_folder='public')

DATABASE = 'data.db' REWARD_AMOUNT = 0.0001

def init_db(): with sqlite3.connect(DATABASE) as conn: c = conn.cursor() c.execute(''' CREATE TABLE IF NOT EXISTS users ( token TEXT PRIMARY KEY, balance REAL DEFAULT 0, last_claim TEXT, ref_by TEXT ) ''') conn.commit()

init_db()

def get_user(token): with sqlite3.connect(DATABASE) as conn: c = conn.cursor() c.execute("SELECT token, balance, last_claim, ref_by FROM users WHERE token = ?", (token,)) return c.fetchone()

def create_user(token, ref_by=None): with sqlite3.connect(DATABASE) as conn: c = conn.cursor() c.execute("INSERT INTO users (token, balance, ref_by) VALUES (?, ?, ?)", (token, 0, ref_by)) conn.commit()

def update_balance(token, amount): with sqlite3.connect(DATABASE) as conn: c = conn.cursor() c.execute("UPDATE users SET balance = balance + ? WHERE token = ?", (amount, token)) conn.commit()

def update_claim_date(token): today = datetime.utcnow().strftime("%Y-%m-%d") with sqlite3.connect(DATABASE) as conn: c = conn.cursor() c.execute("UPDATE users SET last_claim = ? WHERE token = ?", (today, token)) conn.commit()

def claimed_today(last_claim): return last_claim == datetime.utcnow().strftime("%Y-%m-%d")

@app.route('/api/reward', methods=['POST']) def reward(): data = request.json token = data.get('token') ref_by = data.get('referrer')

if not token:
    return jsonify({'success': False, 'message': 'Token gerekli'}), 400

user = get_user(token)
if not user:
    if ref_by == token:
        ref_by = None
    create_user(token, ref_by)
    user = get_user(token)

_, balance, last_claim, user_ref_by = user

if claimed_today(last_claim):
    return jsonify({'success': False, 'message': 'Bugün zaten ödül aldınız'}), 403

update_balance(token, REWARD_AMOUNT)
update_claim_date(token)

if user_ref_by:
    update_balance(user_ref_by, REWARD_AMOUNT)

return jsonify({'success': True})

@app.route('/api/balance/<token>', methods=['GET']) def get_balance(token): user = get_user(token) if user: return jsonify({'balance': round(user[1], 4)}) return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

@app.route('/', defaults={'path': 'index.html'}) @app.route('/path:path') def serve_static(path): return send_from_directory('public', path)

if name == 'main': app.run(debug=True)

