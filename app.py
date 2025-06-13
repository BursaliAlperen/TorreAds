from flask import Flask, request, jsonify, send_from_directory
import json
import os
import uuid  # Benzersiz token'lar oluşturmak için

# --- Flask Uygulamasını Başlatma ---
# __name__ ile Flask'e uygulamanın nerede olduğunu söylüyoruz.
# static_folder='.' ve static_url_path='' ayarları,
# CSS, JS, resim gibi dosyaların ana dizinden sunulmasını sağlar.
app = Flask(__name__, static_folder='.', static_url_path='')
DB_FILE = 'database.json'  # Verileri saklayacağımız JSON dosyasının adı

# --- Yardımcı Fonksiyonlar (Veritabanı) ---

# Veritabanı dosyasını okur ve içeriğini Python dictionary olarak döndürür.
def load_database():
    """Veritabanı dosyasından verileri yükler."""
    if not os.path.exists(DB_FILE):
        return {}  # Dosya yoksa boş bir sözlük döndür
    with open(DB_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}  # Dosya boş veya bozuksa boş sözlük döndür

# Verilen Python dictionary'sini veritabanı dosyasına JSON formatında yazar.
def save_database(db):
    """Verileri veritabanı dosyasına kaydeder."""
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=4, ensure_ascii=False)

# --- Rotalar (Routes) ---
# Rotalar, kullanıcıların hangi URL'ye gittiğinde hangi işlemin yapılacağını belirler.

# Ana Sayfa Rotası ('/')
# Kullanıcı sitenin ana adresine (örn: http://127.0.0.1:5000/) gittiğinde bu fonksiyon çalışır.
@app.route('/')
def index():
    """Ana HTML sayfasını (index.html) sunar."""
    # send_from_directory, belirtilen klasörden dosya göndermeyi sağlar.
    return send_from_directory('.', 'index.html')

# --- API Rotaları (Backend Logic) ---
# API'lar, frontend'in (tarayıcıdaki JavaScript) veri alışverişi yapmak için
# kullandığı özel URL'lerdir. Genellikle JSON formatında veri döndürürler.

# Kullanıcı Bilgilerini Alma veya Oluşturma API'ı
@app.route('/api/user', methods=['POST'])
def handle_user():
    """
    Frontend'den gelen kullanıcı token'ını kontrol eder.
    - Eğer kullanıcı varsa, bilgilerini döndürür.
    - Eğer kullanıcı yoksa, yeni bir kullanıcı oluşturur ve bilgilerini döndürür.
    """
    data = request.json
    user_token = data.get('userToken')
    referrer_token = data.get('referrerToken')
    
    db = load_database()

    if user_token and user_token in db:
        # Mevcut kullanıcıyı bulduk, bilgilerini döndür
        user_data = db[user_token]
    else:
        # Yeni kullanıcı oluştur
        new_token = str(uuid.uuid4())  # Rastgele, benzersiz yeni bir token oluştur
        user_data = {
            "token": new_token,
            "balance": 0.0,
            "referrer": referrer_token if referrer_token in db else None,
            "invitedUsers": []
        }
        db[new_token] = user_data

        # Eğer bir referans koduyla geldiyse, referans olan kullanıcının listesine ekle
        if referrer_token and referrer_token in db:
            db[referrer_token]['invitedUsers'].append(new_token)
        
        save_database(db)
    
    # Kullanıcı bilgilerini JSON formatında frontend'e gönder
    return jsonify(user_data)

# Ödül Ekleme API'ı
@app.route('/api/reward', methods=['POST'])
def grant_reward():
    """Frontend'den gelen token'a sahip kullanıcıya ve referansına ödül verir."""
    data = request.json
    user_token = data.get('userToken')
    reward_amount = 0.0001  # Her reklam izleme için verilecek ödül miktarı
    
    if not user_token:
        return jsonify({"error": "Kullanıcı token'ı gerekli"}), 400

    db = load_database()

    if user_token not in db:
        return jsonify({"error": "Kullanıcı bulunamadı"}), 404

    # Kullanıcının bakiyesini güncelle
    user = db[user_token]
    user['balance'] += reward_amount
    user['balance'] = round(user['balance'], 4) # Ondalık hassasiyet sorunları için yuvarla

    # Referans olan kullanıcının bakiyesini güncelle (%100 ödül)
    referrer_token = user.get('referrer')
    if referrer_token and referrer_token in db:
        db[referrer_token]['balance'] += reward_amount
        db[referrer_token]['balance'] = round(db[referrer_token]['balance'], 4)

    save_database(db)
    
    # Başarılı yanıtı ve güncel bilgileri frontend'e gönder
    return jsonify({
        "success": True,
        "newBalance": user['balance'],
        "message": "Ödül başarıyla eklendi."
    })

# --- Sunucuyu Başlatma ---
# Bu blok, dosya doğrudan 'python app.py' komutuyla çalıştırıldığında devreye girer.
if __name__ == '__main__':
    # app.run(), Flask'in geliştirme sunucusunu başlatır.
    # host='0.0.0.0' ayarı, sunucunun ağdaki diğer cihazlardan erişilebilir olmasını sağlar.
    # port=5000, sunucunun çalışacağı portu belirler.
    # debug=True, kodda değişiklik yapıldığında sunucunun otomatik yeniden başlamasını sağlar.
    app.run(host='0.0.0.0', port=5000, debug=True)