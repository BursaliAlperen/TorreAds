#!/usr/bin/env python3
"""
🌸 Mayiro Beefaucet Fairy - Termux Edition
Ultra simple setup - only XEvil + FaucetPay email needed!
"""

import os
import json
import time
import random
import requests
import urllib.parse
from datetime import datetime
from bs4 import BeautifulSoup

# ===================== SIMPLE UI (No colorama for Termux) =====================
def clear_screen():
    os.system('clear')

def print_banner():
    clear_screen()
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║     🌸  Mayiro Beefaucet Fairy  🌸                  ║
    ║                                                      ║
    ║     (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧  Auto Honey Collector!           ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """)

def safe_input(prompt):
    """Error-proof input handler"""
    try:
        return input(f"✨ {prompt}: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n\n🌸 Goodbye! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧")
        exit(0)

# ===================== SETUP (2 Questions Only) =====================
def setup_config():
    """First-time setup with validation"""
    print_banner()
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║         🎀  QUICK SETUP (2 Questions)  🎀           ║
    ╚══════════════════════════════════════════════════════╝
    """)
    
    # Question 1: Email
    print("\n📧 Step 1/2: Your FaucetPay Email")
    while True:
        email = safe_input("FaucetPay email")
        if '@' in email and '.' in email:
            print("✅ Email looks valid!")
            break
        print("❌ Please enter a valid email!")
    
    # Question 2: XEvil API Key
    print("\n🔑 Step 2/2: XEvil API Key")
    print("   (Found in XEvil → Settings → API Key)")
    while True:
        xevil_key = safe_input("XEvil API key (default: mayiro123)")
        if not xevil_key:
            xevil_key = "mayiro123"
        if len(xevil_key) >= 3:
            print(f"✅ Using API key: {xevil_key}")
            break
        print("❌ API key too short!")
    
    # Create config
    config = {
        "faucet_url": "https://beefaucet.org/faucet",
        "faucetpay_email": email,
        "xevil_api_url": "http://localhost:80",
        "xevil_api_key": xevil_key,
        "captcha_type": "hcaptcha",
        "min_delay": 60,
        "max_delay": 180
    }
    
    # Save config
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)
    
    print_banner()
    print("✅ Setup complete! 🎉")
    print("🌸 Bot starting in 3 seconds...")
    print("   Make sure XEvil is running!\n")
    time.sleep(3)
    
    return config

def load_or_create_config():
    """Load config or create new one"""
    if os.path.exists("config.json"):
        try:
            with open("config.json", "r") as f:
                config = json.load(f)
            # Validate required fields
            if config.get("faucetpay_email") and config.get("xevil_api_key"):
                print(f"📂 Config loaded: {config['faucetpay_email']}")
                return config
        except Exception as e:
            print(f"⚠️  Config error: {e}")
    
    return setup_config()

# ===================== CAPTCHA SOLVER =====================
def solve_captcha(sitekey, page_url, api_key):
    """Solve captcha using XEvil"""
    try:
        # Submit captcha
        resp = requests.get("http://localhost:80/in.php", params={
            "key": api_key,
            "method": "hcaptcha",
            "googlekey": sitekey,
            "pageurl": page_url,
            "json": 1
        }, timeout=10)
        data = resp.json()
    except Exception as e:
        print(f"❌ XEvil connection failed: {e}")
        print("   Is XEvil running on localhost:80?")
        return None
    
    if data.get("status") != 1:
        print(f"❌ XEvil error: {data.get('request', 'unknown')}")
        return None
    
    captcha_id = data["request"]
    print(f"   🤖 Solving captcha #{captcha_id}...", end="", flush=True)
    
    # Wait for solution
    for attempt in range(20):
        time.sleep(5)
        print(".", end="", flush=True)
        
        try:
            check = requests.get("http://localhost:80/res.php", params={
                "key": api_key,
                "action": "get",
                "id": captcha_id,
                "json": 1
            }, timeout=10).json()
        except:
            continue
        
        if check.get("status") == 1:
            print(" ✅")
            return check["request"]
        if check.get("request") == "ERROR_CAPTCHA_UNSOLVABLE":
            print(" ❌")
            return None
    
    print(" ⏰ Timeout!")
    return None

# ===================== CLAIM FUNCTION =====================
def claim_once(config):
    """Single claim attempt"""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36"
    })
    
    # 1. Get page
    print(f"🌐 Loading {config['faucet_url']}...")
    try:
        resp = session.get(config["faucet_url"], timeout=15)
    except Exception as e:
        print(f"❌ Cannot access page: {e}")
        return False
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    # 2. Find sitekey
    captcha_div = soup.find("div", class_="h-captcha")
    if not captcha_div:
        captcha_div = soup.find("div", attrs={"data-sitekey": True})
    
    if not captcha_div:
        print("❌ Captcha not found!")
        return False
    
    sitekey = captcha_div.get("data-sitekey")
    if not sitekey:
        print("❌ Sitekey empty!")
        return False
    
    print(f"🔑 Sitekey: {sitekey[:30]}...")
    
    # 3. Find form
    form_data = {}
    target_form = None
    
    for form in soup.find_all("form"):
        if form.find("div", class_="h-captcha") or form.find("div", attrs={"data-sitekey": True}):
            target_form = form
            break
    
    if target_form:
        for inp in target_form.find_all("input", attrs={"name": True}):
            form_data[inp["name"]] = inp.get("value", "")
    
    # Add email
    if "email" not in form_data and "address" not in form_data:
        form_data["email"] = config["faucetpay_email"]
    
    print(f"📝 Email: {config['faucetpay_email']}")
    
    # 4. Solve captcha
    token = solve_captcha(sitekey, config["faucet_url"], config["xevil_api_key"])
    if not token:
        return False
    
    form_data["h-captcha-response"] = token
    form_data["g-recaptcha-response"] = token
    
    # 5. Submit URL
    action = target_form.get("action") if target_form else ""
    if not action or action == "#":
        action = config["faucet_url"]
    elif not action.startswith("http"):
        action = urllib.parse.urljoin(config["faucet_url"], action)
    
    # 6. Submit claim
    print("📤 Submitting claim...")
    try:
        post_resp = session.post(action, data=form_data, timeout=15)
    except Exception as e:
        print(f"❌ Submit failed: {e}")
        return False
    
    # 7. Check result
    text = post_resp.text.lower()
    
    if "success" in text:
        print("✅ Claim SUCCESSFUL! 🍯💰")
        return True
    elif "already claimed" in text or "too soon" in text:
        print("⏳ Cooldown active, waiting...")
        return "cooldown"
    elif "invalid captcha" in text:
        print("❌ Captcha rejected!")
        return False
    else:
        # Show first 200 chars for debugging
        snippet = post_resp.text[:200].replace('\n', ' ')
        print(f"❓ Unknown response: {snippet}")
        return False

# ===================== STATISTICS =====================
class Stats:
    def __init__(self):
        self.total = 0
        self.success = 0
        self.failed = 0
        self.start_time = datetime.now()
    
    def show(self):
        runtime = datetime.now() - self.start_time
        h = runtime.seconds // 3600
        m = (runtime.seconds % 3600) // 60
        rate = (self.success / self.total * 100) if self.total > 0 else 0
        
        print(f"""
    ╔══════════════════════════════════════════╗
    ║        📊  SESSION STATS  📊            ║
    ╠══════════════════════════════════════════╣
    ║  Runtime: {h}h {m}m                          ║
    ║  Attempts: {self.total}                            ║
    ║  Success: {self.success}                             ║
    ║  Failed: {self.failed}                              ║
    ║  Rate: {rate:.1f}%                            ║
    ╚══════════════════════════════════════════╝
    """)

# ===================== MAIN LOOP =====================
def main():
    print_banner()
    
    # Load config
    config = load_or_create_config()
    
    # Stats
    stats = Stats()
    
    print("🌸 Bot starting! Press Ctrl+C to stop.\n")
    print("─" * 50)
    
    try:
        while True:
            stats.total += 1
            print(f"\n🔄 Attempt #{stats.total} - {datetime.now().strftime('%H:%M:%S')}")
            
            result = claim_once(config)
            
            if result == True:
                stats.success += 1
                delay = random.randint(config["min_delay"], config["max_delay"])
                print(f"⏰ Next claim in {delay//60}m {delay%60}s...")
            elif result == "cooldown":
                stats.failed += 1
                delay = 60
                print(f"⏰ Retrying in {delay}s...")
            else:
                stats.failed += 1
                delay = 30
                print(f"⏰ Retrying in {delay}s...")
            
            # Show stats every 5 attempts
            if stats.total % 5 == 0:
                stats.show()
            
            print("─" * 50)
            time.sleep(delay)
    
    except KeyboardInterrupt:
        print("\n\n🌸 Shutting down...")
        stats.show()
        print(f"✅ Total collected: {stats.success} times!")
        print("🌸 Thanks for using Mayiro! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n")
        
        # Save report
        with open("session_report.txt", "w") as f:
            f.write(f"""
Mayiro Beefaucet Report
{'='*30}
Date: {datetime.now()}
Runtime: {datetime.now() - stats.start_time}
Attempts: {stats.total}
Success: {stats.success}
Failed: {stats.failed}
""")

if __name__ == "__main__":
    main()
