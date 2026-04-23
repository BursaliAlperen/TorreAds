#!/usr/bin/env python3
"""
🌸 Mayiro Beefaucet Fairy v3.0
✅ Auto-detect captcha (hCaptcha & reCAPTCHA)
✅ Custom faucet URL support
✅ Debug mode for troubleshooting
✅ Termux compatible
"""

import os
import json
import time
import random
import requests
import urllib.parse
import re
from datetime import datetime
from bs4 import BeautifulSoup

# ===================== UI =====================
def clear_screen():
    os.system('clear')

def print_banner():
    clear_screen()
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║     🌸  Mayiro Beefaucet Fairy v3.0  🌸             ║
    ║                                                      ║
    ║     (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧  Auto Claim Master!              ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """)

def safe_input(prompt):
    try:
        return input(f"✨ {prompt}: ").strip()
    except (KeyboardInterrupt, EOFError):
        print("\n\n🌸 Goodbye!")
        exit(0)

# ===================== SETUP =====================
def setup_config():
    """First-time setup"""
    print_banner()
    print("""
    ╔══════════════════════════════════════════════════════╗
    ║           🎀  QUICK SETUP  🎀                      ║
    ╚══════════════════════════════════════════════════════╝
    """)
    
    # Faucet URL
    print("\n📌 Step 1/4: Faucet Claim Page URL")
    print("   Examples:")
    print("   [1] Beefaucet.org (default)")
    print("   [2] Custom URL")
    choice = safe_input("Choose (1/2) [1]")
    
    if choice == "2":
        faucet_url = safe_input("Enter full URL (https://...)")
    else:
        faucet_url = "https://beefaucet.org/faucet"
    print(f"✅ URL: {faucet_url}")
    
    # Email
    print("\n📧 Step 2/4: FaucetPay Email")
    while True:
        email = safe_input("Email")
        if '@' in email and '.' in email:
            break
        print("❌ Invalid email!")
    print(f"✅ Email: {email}")
    
    # Captcha type
    print("\n🤖 Step 3/4: Captcha Type")
    print("   [1] hCaptcha (most faucets)")
    print("   [2] reCAPTCHA v2")
    print("   [3] Auto-detect")
    captcha_choice = safe_input("Choose (1/2/3) [3]")
    
    if captcha_choice == "1":
        captcha_type = "hcaptcha"
    elif captcha_choice == "2":
        captcha_type = "recaptcha"
    else:
        captcha_type = "auto"
    print(f"✅ Captcha: {captcha_type}")
    
    # XEvil API key
    print("\n🔑 Step 4/4: XEvil API Key")
    print("   (XEvil → Settings → API Key)")
    xevil_key = safe_input("API key [mayiro123]")
    if not xevil_key:
        xevil_key = "mayiro123"
    print(f"✅ Key: {xevil_key}")
    
    # Timing
    print("\n⏰ Claim Timing (seconds)")
    min_delay = safe_input("Min delay [60]")
    max_delay = safe_input("Max delay [180]")
    
    config = {
        "faucet_url": faucet_url,
        "faucetpay_email": email,
        "xevil_api_url": "http://localhost:80",
        "xevil_api_key": xevil_key,
        "captcha_type": captcha_type,
        "min_delay": int(min_delay) if min_delay.isdigit() else 60,
        "max_delay": int(max_delay) if max_delay.isdigit() else 180,
        "debug": False
    }
    
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)
    
    print_banner()
    print("✅ Setup complete! 🎉")
    print("🌸 Starting in 3 seconds...\n")
    time.sleep(3)
    return config

def load_config():
    """Load or create config"""
    if os.path.exists("config.json"):
        try:
            with open("config.json", "r") as f:
                config = json.load(f)
            if config.get("faucetpay_email") and config.get("xevil_api_key"):
                return config
        except:
            pass
    return setup_config()

# ===================== CAPTCHA DETECTOR =====================
def find_captcha_info(soup, page_url):
    """
    Smart captcha detector - finds all types
    Returns: (sitekey, captcha_type) or (None, None)
    """
    # Method 1: hCaptcha iframe
    hcaptcha_iframe = soup.find('iframe', src=re.compile(r'hcaptcha\.com'))
    if hcaptcha_iframe:
        # Try to find sitekey in parent div or script
        parent = hcaptcha_iframe.find_parent('div')
        if parent and parent.get('data-sitekey'):
            return parent['data-sitekey'], 'hcaptcha'
    
    # Method 2: hCaptcha div
    hcaptcha_div = soup.find('div', class_='h-captcha')
    if hcaptcha_div and hcaptcha_div.get('data-sitekey'):
        return hcaptcha_div['data-sitekey'], 'hcaptcha'
    
    # Method 3: reCAPTCHA div
    recaptcha_div = soup.find('div', class_='g-recaptcha')
    if recaptcha_div and recaptcha_div.get('data-sitekey'):
        return recaptcha_div['data-sitekey'], 'recaptcha'
    
    # Method 4: Any div with data-sitekey
    any_div = soup.find('div', attrs={'data-sitekey': True})
    if any_div:
        sitekey = any_div['data-sitekey']
        # Determine type by class
        div_class = any_div.get('class', [])
        if 'h-captcha' in div_class:
            return sitekey, 'hcaptcha'
        elif 'g-recaptcha' in div_class:
            return sitekey, 'recaptcha'
        else:
            return sitekey, 'hcaptcha'  # default
    
    # Method 5: Search in scripts
    scripts = soup.find_all('script')
    for script in scripts:
        if script.string:
            # hCaptcha sitekey in JS
            h_match = re.search(r'data-sitekey["\']?\s*[:=]\s*["\']([^"\']+)["\']', script.string)
            if h_match:
                return h_match.group(1), 'hcaptcha'
            # reCAPTCHA sitekey
            r_match = re.search(r'grecaptcha\.render\s*\([^,]+,\s*["\']([^"\']+)["\']', script.string)
            if r_match:
                return r_match.group(1), 'recaptcha'
    
    # Method 6: Meta tags
    meta = soup.find('meta', attrs={'name': 'recaptcha-sitekey'})
    if meta:
        return meta['content'], 'recaptcha'
    
    return None, None

# ===================== CAPTCHA SOLVER =====================
def solve_captcha(sitekey, page_url, captcha_type, api_key):
    """Solve captcha with type detection"""
    method = 'hcaptcha' if captcha_type == 'hcaptcha' else 'userrecaptcha'
    
    try:
        resp = requests.get("http://localhost:80/in.php", params={
            "key": api_key,
            "method": method,
            "googlekey": sitekey,
            "pageurl": page_url,
            "json": 1
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
    
    for _ in range(24):  # 2 minutes max
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
            print(" ✅ Solved!")
            return check["request"]
        if check.get("request") == "ERROR_CAPTCHA_UNSOLVABLE":
            print(" ❌ Unsolvable!")
            return None
    
    print(" ⏰ Timeout!")
    return None

# ===================== PAGE DEBUGGER =====================
def debug_page(url):
    """Show page structure for troubleshooting"""
    print(f"\n🔍 DEBUG: Analyzing {url}")
    try:
        resp = requests.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'
        })
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        print("\n📄 Page Info:")
        print(f"   Status: {resp.status_code}")
        print(f"   Title: {soup.title.string if soup.title else 'N/A'}")
        print(f"   Forms: {len(soup.find_all('form'))}")
        
        print("\n🔍 Searching for captcha...")
        
        # List all divs with data-sitekey
        sitekey_divs = soup.find_all('div', attrs={'data-sitekey': True})
        print(f"   Divs with data-sitekey: {len(sitekey_divs)}")
        for div in sitekey_divs:
            print(f"   → Class: {div.get('class')}, Sitekey: {div.get('data-sitekey')[:50]}...")
        
        # List iframes
        iframes = soup.find_all('iframe')
        print(f"   Iframes: {len(iframes)}")
        for iframe in iframes:
            src = iframe.get('src', '')[:80]
            print(f"   → {src}")
        
        # Search in scripts
        scripts = soup.find_all('script')
        for i, script in enumerate(scripts):
            if script.string and ('sitekey' in script.string or 'captcha' in script.string.lower()):
                print(f"   Script #{i} contains captcha reference (length: {len(script.string)})")
        
        # Show full HTML if very small
        if len(resp.text) < 5000:
            print("\n📝 Full HTML:")
            print(resp.text[:2000])
        else:
            print(f"\n📝 Page size: {len(resp.text)} chars (too large to show)")
            
    except Exception as e:
        print(f"❌ Debug failed: {e}")

# ===================== CLAIM FUNCTION =====================
def claim_once(config, debug=False):
    """Single claim attempt"""
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    })
    
    # 1. Load page
    print(f"🌐 Loading: {config['faucet_url']}")
    try:
        resp = session.get(config['faucet_url'], timeout=20)
        resp.raise_for_status()
    except Exception as e:
        print(f"❌ Cannot load page: {e}")
        return False
    
    print(f"   Status: {resp.status_code}, Size: {len(resp.text)} bytes")
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # 2. Find captcha
    sitekey, detected_type = find_captcha_info(soup, config['faucet_url'])
    
    if not sitekey:
        print("❌ CAPTCHA NOT FOUND!")
        print(f"   Debug mode: {debug}")
        if debug or config.get('debug'):
            debug_page(config['faucet_url'])
        else:
            print("   💡 Try: Delete config.json and set captcha_type to 'auto'")
        return False
    
    print(f"🔑 Found sitekey: {sitekey[:40]}...")
    print(f"   Type: {detected_type}")
    
    # Use auto-detected or configured type
    captcha_type = config['captcha_type'] if config['captcha_type'] != 'auto' else detected_type
    
    # 3. Find form
    form_data = {}
    target_form = None
    forms = soup.find_all('form')
    
    for form in forms:
        if (form.find('div', class_='h-captcha') or 
            form.find('div', class_='g-recaptcha') or
            form.find('div', attrs={'data-sitekey': True}) or
            form.find('iframe', src=re.compile(r'captcha'))):
            target_form = form
            break
    
    if target_form:
        for inp in target_form.find_all(['input', 'select'], attrs={'name': True}):
            if inp.name == 'select':
                selected = inp.find('option', selected=True)
                form_data[inp['name']] = selected['value'] if selected else ''
            else:
                form_data[inp['name']] = inp.get('value', '')
    
    # Add email
    email_fields = ['email', 'address', 'wallet', 'faucetpay_email', 'fp_email']
    has_email = any(field in form_data for field in email_fields)
    if not has_email:
        form_data['email'] = config['faucetpay_email']
    
    print(f"📝 Form fields: {list(form_data.keys())}")
    
    # 4. Solve captcha
    token = solve_captcha(sitekey, config['faucet_url'], captcha_type, config['xevil_api_key'])
    if not token:
        return False
    
    # Add token to correct field
    if captcha_type == 'hcaptcha':
        form_data['h-captcha-response'] = token
    else:
        form_data['g-recaptcha-response'] = token
    # Some sites need both
    if 'g-recaptcha-response' not in form_data:
        form_data['g-recaptcha-response'] = token
    if 'h-captcha-response' not in form_data:
        form_data['h-captcha-response'] = token
    
    # 5. Submit URL
    action = target_form.get('action') if target_form else ''
    if not action or action == '#':
        action = config['faucet_url']
    elif not action.startswith('http'):
        action = urllib.parse.urljoin(config['faucet_url'], action)
    
    # 6. Submit
    print(f"📤 Submitting to: {action}")
    try:
        post_resp = session.post(action, data=form_data, timeout=20, allow_redirects=True)
    except Exception as e:
        print(f"❌ Submit failed: {e}")
        return False
    
    print(f"   Response: {post_resp.status_code}")
    
    # 7. Check result
    text = post_resp.text.lower()
    
    # Success patterns
    success_patterns = ['successfully', 'claimed', 'sent to', 'congratulations', 'reward']
    if any(pattern in text for pattern in success_patterns):
        print("✅ CLAIM SUCCESSFUL! 🍯💰")
        return True
    
    # Cooldown patterns
    cooldown_patterns = ['already claimed', 'too soon', 'try again later', 'minutes', 'hours']
    if any(pattern in text for pattern in cooldown_patterns):
        print("⏳ Cooldown active")
        return "cooldown"
    
    # Error patterns
    if 'invalid captcha' in text or 'captcha failed' in text:
        print("❌ Captcha rejected")
        return False
    
    # Show snippet
    snippet = post_resp.text[:300].replace('\n', ' ').strip()
    print(f"❓ Response: {snippet}")
    
    if debug or config.get('debug'):
        print(f"\n📄 Full response saved to 'debug_response.html'")
        with open('debug_response.html', 'w') as f:
            f.write(post_resp.text)
    
    return False

# ===================== STATS =====================
class Stats:
    def __init__(self):
        self.total = 0
        self.success = 0
        self.cooldowns = 0
        self.failed = 0
        self.start_time = datetime.now()
    
    def show(self):
        runtime = datetime.now() - self.start_time
        h = runtime.seconds // 3600
        m = (runtime.seconds % 3600) // 60
        s = runtime.seconds % 60
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
    ║  📈 Success Rate: {rate:.1f}%                        ║
    ╚══════════════════════════════════════════════╝
    """)

# ===================== MAIN =====================
def main():
    print_banner()
    config = load_config()
    stats = Stats()
    
    # Debug mode check
    debug = '--debug' in os.sys.argv if hasattr(os, 'sys') else False
    
    print("🌸 Bot starting! Press Ctrl+C to stop.")
    print(f"🎯 Target: {config['faucet_url']}")
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
                print(f"⏰ Cooldown, retry in {delay}s...")
            else:
                stats.failed += 1
                delay = 10
                print(f"⏰ Retry in {delay}s...")
            
            if stats.total % 5 == 0:
                stats.show()
            
            print("─" * 55)
            time.sleep(delay)
    
    except KeyboardInterrupt:
        print("\n\n🌸 Shutting down gracefully...")
        stats.show()
        print(f"✅ Total claims: {stats.success}")
        print("🌸 Thanks for using Mayiro! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n")
        
        with open("session_report.txt", "w") as f:
            f.write(f"""Mayiro Beefaucet Report
{'='*30}
Date: {datetime.now()}
Runtime: {datetime.now() - stats.start_time}
Target: {config['faucet_url']}
Attempts: {stats.total}
Success: {stats.success}
Cooldowns: {stats.cooldowns}
Failed: {stats.failed}
""")

if __name__ == "__main__":
    # Check for debug flag
    import sys
    if '--debug' in sys.argv:
        print("🔍 Debug mode enabled")
    
    main()
