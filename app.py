from flask import Flask, request, jsonify, send_from_directory
import json
import os
import uuid

app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'database.json'

# Veritabanını yükle
def load_database():
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

# Veritabanını kaydet
def save_database(db):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4, ensure_ascii=False)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Kullanıcı oluşturma veya alma
@app.route('/api/user', methods=['POST'])
def handle_user():
    data = request.json
    user_token = data.get('userToken')
    
    db = load_database()

    if user_token and user_token in db:
        user_data = db[user_token]
    else:
        new_token = str(uuid.uuid4())
        user_data = {
            "token": new_token,
            "balance": 0.0
        }
        db[new_token] = user_data
        save_database(db)
    
    return jsonify(user_data)

# Ödül verme
@app.route('/api/reward', methods=['POST'])
def grant_reward():
    data = request.json
    user_token = data.get('userToken')
    reward_amount = 0.0001

    if not user_token:
        return jsonify({"error": "Kullanıcı token'ı gerekli"}), 400

    db = load_database()

    if user_token not in db:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404

    user = db[user_token]
    user['balance'] += reward_amount
    user['balance'] = round(user['balance'], 4)

    save_database(db)

    return jsonify({
        "success": True,
        "newBalance": user['balance'],
        "message": "Ödül başarıyla eklendi."
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)    app.run(host='0.0.0.0', port=5000, debug=True)
