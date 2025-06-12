from flask import Flask, request, jsonify, render_template
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
                token TEXT NOT NULL,
                total_views INTEGER DEFAULT 0,
                balance REAL DEFAULT 0.0
            )
        ''')
        conn.commit()
        conn.close()

@app.route('/')
def home():
    return render_template('index.html')

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
        new_balance = round(balance + 0.0001, 8)
        cursor.execute("UPDATE ad_views SET total_views = total_views + 1, balance = ? WHERE token = ?", (new_balance, token))
    else:
        cursor.execute("INSERT INTO ad_views (token, total_views, balance) VALUES (?, ?, ?)", (token, 1, 0.0001))

    conn.commit()
    conn.close()

    return jsonify(success=True, message="🎉 0.0001 TON kazandınız!")

@app.route('/api/balance/<token>', methods=['GET'])
def get_balance(token):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT balance FROM ad_views WHERE token = ?", (token,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify(success=True, balance=row['balance'])
    else:
        return jsonify(success=False, message="🧐 Token bulunamadı.", balance=0.0)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
