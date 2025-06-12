
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
                total_views INTEGER DEFAULT 0
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

    cursor.execute("SELECT total_views FROM ad_views WHERE token = ?", (token,))
    row = cursor.fetchone()

    if row:
        total_views = row['total_views']
        if total_views >= 1000:
            conn.close()
            return jsonify(success=False, message="🚫 1000 reklam izleme sınırına ulaştınız."), 403
        cursor.execute("UPDATE ad_views SET total_views = total_views + 1 WHERE token = ?", (token,))
    else:
        cursor.execute("INSERT INTO ad_views (token, total_views) VALUES (?, ?)", (token, 1))

    conn.commit()
    conn.close()

    return jsonify(success=True, message="🎉 0.0001 TON kazandınız!")

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5001, debug=True)
