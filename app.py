from flask import Flask, jsonify, request, send_from_directory, render_template_string
import os

app = Flask(__name__)

# Basit veri yapısı (örnek, gerçek projede DB gerekir)
users = {
    "user1": {
        "balance": 0.0,
        "referrals": 0,
        "referral_link": "http://localhost:5000/?ref=user1"
    }
}

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/style.css')
def css():
    return send_from_directory('static', 'style.css')

@app.route('/script.js')
def script():
    return send_from_directory('static', 'script.js')

@app.route('/api/get_user_data')
def get_user_data():
    user_id = request.args.get('user', 'user1')  # Örnek
    user = users.get(user_id)
    if user:
        return jsonify({
            "balance": user['balance'],
            "referrals": user['referrals'],
            "referral_link": user['referral_link']
        })
    else:
        return jsonify({"error": "User not found"}), 404

@app.route('/api/reward', methods=['POST'])
def reward():
    user_id = request.json.get('user')
    amount = request.json.get('amount', 0)
    if user_id in users:
        users[user_id]['balance'] += amount
        return jsonify({"balance": users[user_id]['balance']})
    else:
        return jsonify({"error": "User not found"}), 404

if __name__ == '__main__':
    app.run(debug=True)
