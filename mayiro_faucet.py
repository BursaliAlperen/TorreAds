#!/usr/bin/env python3
"""
🌸 Mayiro Beefaucet Fairy v3.1 - Complete Auto Claim Bot
Termux compatible, XEvil ile otomatik captcha çözümü
"""

import os
import json
import time
import random
import requests
import re
import sys
from datetime import datetime
from bs4 import BeautifulSoup

# ==================== UI ====================
def clear_screen():
    os.system('clear')

def banner():
    clear_screen()
    print("""
╔══════════════════════════════════════════════════════╗
║                                                      ║
║     🌸  Mayiro Beefaucet Fairy v3.1  🌸             ║
║                                                      ║
║     (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧  Auto Claim Master!              ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
    """)

def get_input(prompt, default=""):
    try:
        val = input(f"✨ {prompt}: ").strip()
        return val if val else default
    except (KeyboardInterrupt, EOFError):
        print("\n\n🌸 Goodbye!")
        sys.exit(0)

# ==================== SETUP ====================
def first_time_setup():
    banner()
    print("╔══════════════════════════════════════════════════════╗")
    print("║           🎀  FIRST TIME SETUP  🎀                 ║")
    print("╚══════════════════════════════════════════════════════╝")
    
    # URL
    print("\n📌 Step 1/4: Faucet URL")
    print("   [1] Beefaucet.org (Doge/LTC/TRX...)")
    print("   [2] Custom URL")
    url_choice = get_input("Choose (1/2)", "1")
    if url_choice == "2":
        faucet_url = get_input("Enter full URL (https://...)")
        if not faucet_url.startswith("http"):
            faucet_url = "https://" + faucet_url
    else:
        faucet_url = "https://beefaucet.org/faucet"
    print(f"   ✅ {faucet_url}")
    
    # Email
    print("\n📧 Step 2/4: FaucetPay Email")
    while True:
        email = get_input("Email address")
        if "@" in email and "." in email:
            break
        print("   ❌ Invalid email!")
    print(f"   ✅ {email}")
    
    # Captcha type
    print("\n🤖 Step 3/4: Captcha Type")
    print("   [1] hCaptcha")
    print("   [2] reCAPTCHA")
    print("   [3] Auto-detect (recommended)")
    captcha_choice = get_input("Choose (1/2/3)", "3")
    captcha_map = {"1": "hcaptcha", "2": "recaptcha", "3": "auto"}
    captcha_type = captcha_map.get(captcha_choice, "auto")
    print(f"   ✅ {captcha_type}")
    
    # XEvil API key
    print("\n🔑 Step 4/4: XEvil API Key")
    print("   (Open XEvil → Settings → API Key)")
    xevil_key = get_input("API key", "mayiro123")
    print(f"   ✅ {xevil_key}")
    
    # Timing
    print("\n⏰ Claim Timing (seconds)")
    min_d = get_input("Min delay", "60")
    max_d = get_input("Max delay", "180")
    
    config = {
        "faucet_url": faucet_url,
        "faucetpay_email": email,
        "xevil_api_url": "http://localhost:80",
        "xevil_api_key": xevil_key,
        "captcha_type": captcha_type,
        "min_delay": int(min_d) if min_d.isdigit() else 60,
        "max_delay": int(max_d) if max_d.isdigit() else 180,
        "debug": False
    }
    
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)
    
    banner()
    print("✅ Setup complete! 🎉")
    print("🌸 Starting in 3 seconds...\n")
    time.sleep(3)
    return config

def load_config():
    if os.path.exists("config.json"):
        try:
            with open("config.json", "r") as f:
                config = json.load(f)
            if config.get("faucetpay_email") and config.get("xevil_api_key"):
                return config
        except:
            pass
    return first_time_setup()

# ==================== CAPTCHA DETECTOR ====================
def find_captcha_info(soup, page_url):
    """6 farklı yöntemle captcha sitekey'ini bulur"""
    # 1. hCaptcha iframe
    iframe = soup.find('iframe', src=re.compile(r'hcaptcha\.com'))
    if iframe:
        parent = iframe.find_parent('div')
        if parent and parent.get('data-sitekey'):
            return parent['data-sitekey'], 'hcaptcha'
    
    # 2. hCaptcha div
    div = soup.find('div', class_='h-captcha')
    if div and div.get('data-sitekey'):
        return div['data-sitekey'], 'hcaptcha'
    
    # 3. reCAPTCHA div
    div = soup.find('div', class_='g-recaptcha')
    if div and div.get('data-sitekey'):
        return div['data-sitekey'], 'recaptcha'
    
    # 4. data-sitekey olan herhangi bir div
    div = soup.find('div', attrs={'data-sitekey': True})
    if div:
        sitekey = div['data-sitekey']
        classes = div.get('class', [])
        if 'h-captcha' in classes:
            return sitekey, 'hcaptcha'
        if 'g-recaptcha' in classes:
            return sitekey, 'recaptcha'
        return sitekey, 'hcaptcha'  # varsayılan
    
    # 5. JavaScript içinde ara
    for script in soup.find_all('script'):
        if script.string:
            match = re.search(r'data-sitekey["\']?\s*[:=]\s*["\']([^"\']+)["\']', script.string)
            if match:
                return match.group(1), 'hcaptcha'
            match = re.search(r'grecaptcha\.render\s*\([^,]+,\s*["\']([^"\']+)["\']', script.string)
            if match:
                return match.group(1), 'recaptcha'
    
    # 6. Meta etiketi
    meta = soup.find('meta', attrs={'name': 'recaptcha-sitekey'})
    if meta:
        return meta['content'], 'recaptcha'
    
    return None, None

# ==================== CAPTCHA SOLVER ====================
def solve_captcha(sitekey, page_url, captcha_type, api_key):
    method = 'hcaptcha' if captcha_type == 'hcaptcha' else 'userrecaptcha'
    try:
        resp = requests.get("http://localhost:80/in.php", params={
            "key": api_key, "method": method,
            "googlekey": sitekey, "pageurl": page_url, "json": 1
        }, timeout=10)
        data = resp.json()
    except Exception as e:
        print(f"❌ XEvil error: {e}")
        return None
    
    if data.get("status") != 1:
        print(f"❌ XEvil: {data.get('request', 'error')}")
        return None
    
    captcha_id = data["request"]
    print(f"   🤖 Solving {captcha_type} #{captcha_id}...", end="", flush=True)
    
    for _ in range(24):
        time.sleep(5)
        print(".", end="", flush=True)
        try:
            check = requests.get("http://localhost:80/res.php", params={
                "key": api_key, "action": "get", "id": captcha_id, "json": 1
            }, timeout=10).json()
        except:
            continue
        if check.get("status") == 1:
            print(" ✅")
            return check["request"]
        if check.get("request") == "ERROR_CAPTCHA_UNSOLVABLE":
            print(" ❌")
            return None
    print(" ⏰ Timeout")
    return None

# ==================== CLAIM ====================
def claim_once(config, debug=False):
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    })
    
    print(f"🌐 Loading: {config['faucet_url']}")
    try:
        resp = session.get(config['faucet_url'], timeout=20)
        resp.raise_for_status()
    except Exception as e:
        print(f"❌ Page load failed: {e}")
        return False
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # Captcha bul
    sitekey, detected_type = find_captcha_info(soup, config['faucet_url'])
    if not sitekey:
        print("❌ CAPTCHA NOT FOUND!")
        if debug or config.get('debug'):
            _debug_page(config['faucet_url'])
        return False
    print(f"🔑 Sitekey: {sitekey[:40]}... ({detected_type})")
    
    captcha_type = config['captcha_type'] if config['captcha_type'] != 'auto' else detected_type
    
    # Form verilerini topla
    form_data = {}
    target_form = None
    for form in soup.find_all('form'):
        if (form.find('div', class_='h-captcha') or 
            form.find('div', class_='g-recaptcha') or
            form.find('div', attrs={'data-sitekey': True})):
            target_form = form
            break
    if target_form:
        for inp in target_form.find_all(['input', 'select'], attrs={'name': True}):
            if inp.name == 'select':
                opt = inp.find('option', selected=True)
                form_data[inp['name']] = opt['value'] if opt else ''
            else:
                form_data[inp['name']] = inp.get('value', '')
    
    # E-posta alanı
    if not any(f in form_data for f in ['email', 'address', 'wallet']):
        form_data['email'] = config['faucetpay_email']
    
    print(f"📝 Form fields: {list(form_data.keys())}")
    
    # Captcha çöz
    token = solve_captcha(sitekey, config['faucet_url'], captcha_type, config['xevil_api_key'])
    if not token:
        return False
    
    form_data['h-captcha-response'] = token
    form_data['g-recaptcha-response'] = token
    
    # Submit URL
    action = target_form.get('action') if target_form else ''
    if not action or action == '#':
        action = config['faucet_url']
    elif not action.startswith('http'):
        from urllib.parse import urljoin
        action = urljoin(config['faucet_url'], action)
    
    print(f"📤 Submitting to: {action}")
    try:
        post_resp = session.post(action, data=form_data, timeout=20)
    except Exception as e:
        print(f"❌ Submit failed: {e}")
        return False
    
    text = post_resp.text.lower()
    
    # Başarı kontrolü
    success_words = ['successfully', 'claimed', 'sent to', 'congratulations', 'reward']
    if any(w in text for w in success_words):
        print("✅ CLAIM SUCCESSFUL! 🍯💰")
        return True
    
    # Cooldown kontrolü
    if any(w in text for w in ['already claimed', 'too soon', 'try again later']):
        print("⏳ Cooldown active")
        return "cooldown"
    
    if 'invalid captcha' in text:
        print("❌ Captcha rejected")
        return False
    
    print(f"❓ Unknown response: {post_resp.text[:200]}")
    return False

def _debug_page(url):
    print(f"\n🔍 Debugging {url}")
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        soup = BeautifulSoup(resp.text, 'html.parser')
        print(f"Status: {resp.status_code}, Title: {soup.title.string if soup.title else 'N/A'}")
        print(f"Forms: {len(soup.find_all('form'))}")
        for div in soup.find_all('div', attrs={'data-sitekey': True}):
            print(f"  Div: {div.get('class')}, sitekey={div.get('data-sitekey')[:50]}...")
        for script in soup.find_all('script'):
            if script.string and 'sitekey' in script.string:
                print(f"  Script with sitekey found (len={len(script.string)})")
    except Exception as e:
        print(f"Debug error: {e}")

# ==================== STATS ====================
class Stats:
    def __init__(self):
        self.total = 0
        self.success = 0
        self.cooldowns = 0
        self.failed = 0
        self.start_time = datetime.now()
    
    def show(self):
        runtime = datetime.now() - self.start_time
        h, remainder = divmod(runtime.seconds, 3600)
        m, s = divmod(remainder, 60)
        rate = (self.success / self.total * 100) if self.total > 0 else 0
        print(f"""
╔══════════════════════════════════════════════╗
║           📊  SESSION STATS  📊             ║
╠══════════════════════════════════════════════╣
║  Runtime: {h}h {m}m {s}s                       ║
║  Attempts: {self.total}                                ║
║  ✅ Success: {self.success}                               ║
║  ⏳ Cooldowns: {self.cooldowns}                             ║
║  ❌ Failed: {self.failed}                                 ║
║  📈 Rate: {rate:.1f}%                             ║
╚══════════════════════════════════════════════╝
""")

# ==================== MAIN ====================
def main():
    banner()
    config = load_config()
    stats = Stats()
    debug = '--debug' in sys.argv
    
    print(f"🌸 Target: {config['faucet_url']}")
    print(f"📧 Email: {config['faucetpay_email']}")
    print("─" * 55)
    
    try:
        while True:
            stats.total += 1
            print(f"\n🔄 Attempt #{stats.total} [{datetime.now().strftime('%H:%M:%S')}]")
            result = claim_once(config, debug)
            
            if result == True:
                stats.success += 1
                delay = random.randint(config['min_delay'], config['max_delay'])
                print(f"⏰ Next in {delay//60}m {delay%60}s...")
            elif result == "cooldown":
                stats.cooldowns += 1
                delay = random.randint(30, 90)
                print(f"⏰ Retry in {delay}s...")
            else:
                stats.failed += 1
                delay = 10
                print(f"⏰ Retry in {delay}s...")
            
            if stats.total % 5 == 0:
                stats.show()
            
            print("─" * 55)
            time.sleep(delay)
    except KeyboardInterrupt:
        print("\n\n🌸 Shutting down...")
        stats.show()
        print(f"✅ Total claims: {stats.success}")
        print("🌸 Thanks for using Mayiro! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n")
        with open("session_report.txt", "w") as f:
            f.write(f"Date: {datetime.now()}\nRuntime: {datetime.now()-stats.start_time}\n"
                    f"Success: {stats.success}\nFailed: {stats.failed}\nCooldowns: {stats.cooldowns}\n")

if __name__ == "__main__":
    main()
