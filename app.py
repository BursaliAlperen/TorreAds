import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from flask import Flask, request, jsonify
from datetime import datetime
import os
import json

app = Flask(__name__)
LOG_FILE = 'user_ads.json'
DAILY_LIMIT = 1000

def load_logs():
    if not os.path.exists(LOG_FILE):
        return {}
    with open(LOG_FILE, 'r') as f:
        return json.load(f)

def save_logs(logs):
    with open(LOG_FILE, 'w') as f:
        json.dump(logs, f)

@app.route('/api/checkLimit', methods=['POST'])
def check_limit():
    token = request.json.get('token')
    logs = load_logs()
    today = datetime.utcnow().strftime('%Y-%m-%d')

    count = logs.get(token, {}).get(today, 0)
    return jsonify({'allowed': count < DAILY_LIMIT})

@app.route('/api/logAdView', methods=['POST'])
def log_ad_view():
    token = request.json.get('token')
    logs = load_logs()
    today = datetime.utcnow().strftime('%Y-%m-%d')

    if token not in logs:
        logs[token] = {}
    logs[token][today] = logs[token].get(today, 0) + 1

    save_logs(logs)
    return jsonify({'status': 'logged'})

# --- App Configuration ---
app = Flask(__name__)
# Geliştirme ortamında tarayıcıdan gelen istekler için CORS'a izin ver
CORS(app) 

# --- Database Configuration ---
DB_NAME = 'data.db'

def get_db_connection():
    """Veritabanı bağlantısı oluşturur."""
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row # Sütun adlarıyla erişim için
    return conn

def init_db():
    """Veritabanı ve tabloyu oluşturur (eğer yoksa)."""
    if os.path.exists(DB_NAME):
        return
    print(f"'{DB_NAME}' bulunamadı, yeni bir veritabanı oluşturuluyor...")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ad_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    print("Veritabanı başarıyla oluşturuldu.")

# --- API Endpoints ---
@app.route('/api/reward', methods=['POST'])
def reward():
    """Kullanıcı token'ını alır ve günlük limiti kontrol ederek ödül verir."""
    data = request.get_json()
    if not data or 'token' not in data:
        return jsonify({"success": False, "message": "Geçersiz istek: Token eksik."}), 400

    token = data['token']
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Token için bugünkü izleme sayısını al
    # SQLite'ta saat dilimini doğru yönetmek için 'localtime' kullanılır
    query = """
        SELECT COUNT(id) as today_views
        FROM ad_views
        WHERE token = ? AND DATE(timestamp, 'localtime') = DATE('now', 'localtime')
    """
    cursor.execute(query, (token,))
    result = cursor.fetchone()
    today_views = result['today_views'] if result else 0

    DAILY_LIMIT = 5
    if today_views >= DAILY_LIMIT:
        conn.close()
        return jsonify({
            "success": False, 
            "message": "⚠️ Günlük izleme hakkını doldurdun."
        }), 429 # 429 Too Many Requests

    # Yeni izlemeyi kaydet
    insert_query = "INSERT INTO ad_views (token) VALUES (?)"
    cursor.execute(insert_query, (token,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True, 
        "message": "🎉 Ödül kazandın!", 
        "views_today": today_views + 1
    })

# --- Main Execution ---
if __name__ == '__main__':
    init_db()
    # Geliştirme için debug modunda çalıştır
    # Üretim ortamında Gunicorn gibi bir WSGI sunucusu kullanılmalıdır.
    app.run(host='0.0.0.0', port=5001, debug=True)


