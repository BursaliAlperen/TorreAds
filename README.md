# Monetag Reward Backend (Flask)

## Kurulum

```bash
python -m venv venv
source venv/bin/activate  # Windows'da venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Sunucu 0.0.0.0:8000'de çalışır.

## API

### POST /api/odul
```json
{
  "uid": "123456",
  "miktar": 0.0001
}
```
Yanıt:
```json
{
  "message": "Bakiye güncellendi",
  "uid": "123456",
  "yeni_bakiye": 0.0002
}
```

### GET /api/bakiye/<uid>
Yanıt:
```json
{
  "uid": "123456",
  "bakiye": 0.0002
}
```