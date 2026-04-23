#!/usr/bin/env python3
"""
🌸 Mayiro Beefaucet Fairy - Auto Claim Bot with XEvil
Auto‑generates config, solves captchas, claims forever!
"""

import os
import json
import time
import random
import logging
import requests
import urllib.parse
from datetime import datetime
from bs4 import BeautifulSoup
from colorama import init, Fore, Style, Back

# ===================== INITIALIZATION =====================
init(autoreset=True)

# ===================== KAWAIİ UI ELEMENTS =====================
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_kawaii_banner():
    clear_screen()
    print(Fore.MAGENTA + Style.BRIGHT + r"""
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║     🌸  𝓜𝓪𝔂𝓲𝓻𝓸  𝓑𝓮𝓮𝓕𝓪𝓾𝓬𝓮𝓽  𝓕𝓪𝓲𝓻𝔂  🌸                  ║
    ║                                                      ║
    ║     (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧  I'm your honey collector!        ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    """ + Style.RESET_ALL)

def kawaii_input(prompt):
    """Cute input wrapper with sparkles"""
    return input(Fore.CYAN + "✨ " + prompt + " ✨: " + Style.RESET_ALL)

def kawaii_print(message, emoji="🌸"):
    print(f"{Fore.MAGENTA}{emoji} {message}{Style.RESET_ALL}")

def kawaii_success(message):
    print(f"{Fore.GREEN}✅ {message}{Style.RESET_ALL}")

def kawaii_warning(message):
    print(f"{Fore.YELLOW}⚠️  {message}{Style.RESET_ALL}")

def kawaii_error(message):
    print(f"{Fore.RED}❌ {message}{Style.RESET_ALL}")

# ===================== CONFIG GENERATOR =====================
def generate_config():
    """Interactive first‑time setup wizard"""
    print_kawaii_banner()
    print(Fore.YELLOW + Style.BRIGHT + """
    ╔══════════════════════════════════════════════════════╗
    ║         🎀  FIRST TIME SETUP WIZARD  🎀              ║
    ╚══════════════════════════════════════════════════════╝
    """ + Style.RESET_ALL)
    
    config = {}
    
    # Faucet URL
    print(Fore.CYAN + "\n📌 Which faucet do you want to claim from?" + Style.RESET_ALL)
    print(Fore.WHITE + "   [1] Beefaucet.org (Doge, LTC, etc.)" + Style.RESET_ALL)
    print(Fore.WHITE + "   [2] Custom faucet URL" + Style.RESET_ALL)
    choice = kawaii_input("Choose (1 or 2)")
    
    if choice == "1":
        config['faucet_url'] = "https://beefaucet.org/faucet"
        kawaii_success("Beefaucet.org selected!")
    else:
        config['faucet_url'] = kawaii_input("Enter full faucet claim page URL")
    
    # FaucetPay email
    print(Fore.CYAN + "\n📧 Enter your FaucetPay email address:" + Style.RESET_ALL)
    config['faucetpay_email'] = kawaii_input("FaucetPay email")
    
    # Captcha type
    print(Fore.CYAN + "\n🤖 Which captcha does the site use?" + Style.RESET_ALL)
    print(Fore.WHITE + "   [1] hCaptcha (most faucets)" + Style.RESET_ALL)
    print(Fore.WHITE + "   [2] reCAPTCHA v2" + Style.RESET_ALL)
    captcha_choice = kawaii_input("Choose (1 or 2)")
    config['captcha_type'] = "hcaptcha" if captcha_choice == "1" else "recaptcha"
    
    # XEvil settings
    print(Fore.CYAN + "\n🔧 XEvil Captcha Solver Settings:" + Style.RESET_ALL)
    print(Fore.WHITE + "   XEvil should be running on your PC" + Style.RESET_ALL)
    
    xevil_url = kawaii_input("XEvil API URL (default: http://localhost:80)")
    config['xevil_api_url'] = xevil_url if xevil_url else "http://localhost:80"
    
    xevil_key = kawaii_input("XEvil API Key (default: mayiro123)")
    config['xevil_api_key'] = xevil_key if xevil_key else "mayiro123"
    
    # Timing settings
    print(Fore.CYAN + "\n⏰ Claim timing settings:" + Style.RESET_ALL)
    min_time = kawaii_input("Minimum seconds between claims (default: 60)")
    config['min_claim_interval_seconds'] = int(min_time) if min_time else 60
    
    max_time = kawaii_input("Maximum seconds between claims (default: 300)")
    config['max_claim_interval_seconds'] = int(max_time) if max_time else 300
    
    # Save config
    with open("config.json", "w") as f:
        json.dump(config, f, indent=4)
    
    # Generate README
    generate_readme(config)
    
    print_kawaii_banner()
    kawaii_success("Configuration saved successfully! 🎉")
    print(Fore.GREEN + Style.BRIGHT + """
    ╔══════════════════════════════════════════════════════╗
    ║  🌸  Setup complete! Bot will start in 3 seconds...  ║
    ╚══════════════════════════════════════════════════════╝
    """ + Style.RESET_ALL)
    time.sleep(3)
    
    return config

def generate_readme(config):
    """Create a cute instruction file"""
    readme_content = f"""
🌸 Mayiro Beefaucet Fairy - Instructions 🌸
{'='*50}

✨ Your Configuration:
   • Faucet URL: {config['faucet_url']}
   • Email: {config['faucetpay_email']}
   • Captcha Type: {config['captcha_type']}
   • XEvil API: {config['xevil_api_url']}

🚀 To Start the Bot:
   1. Make sure XEvil is running
   2. Run: python mayiro_faucet.py
   3. The bot will claim automatically!

💡 Tips:
   • Press Ctrl+C to stop
   • Delete config.json to reconfigure
   • Check logs for detailed info

🌸 Made with love by Mayiro 🌸
"""
    with open("README.txt", "w") as f:
        f.write(readme_content)

def load_config():
    """Load or generate configuration"""
    if not os.path.exists("config.json"):
        kawaii_warning("No config found! Let's set things up...")
        return generate_config()
    
    with open("config.json", "r") as f:
        config = json.load(f)
    
    # Validate required fields
    required = ['faucet_url', 'faucetpay_email', 'xevil_api_url', 'xevil_api_key', 'captcha_type']
    missing = [field for field in required if field not in config]
    
    if missing:
        kawaii_warning(f"Config is missing: {missing}. Re‑configuring...")
        return generate_config()
    
    return config

# ===================== XEVIL CAPTCHA SOLVER =====================
def solve_captcha(sitekey, page_url, cfg):
    """Send captcha to local XEvil, return token"""
    payload = {
        'key': cfg['xevil_api_key'],
        'method': 'hcaptcha' if cfg['captcha_type'].lower() == 'hcaptcha' else 'userrecaptcha',
        'googlekey': sitekey,
        'pageurl': page_url,
        'json': 1
    }
    
    try:
        kawaii_print("Solving captcha...", "🤖")
        resp = requests.get(f"{cfg['xevil_api_url']}/in.php", params=payload, timeout=30)
        data = resp.json()
    except Exception as e:
        logging.error(f"XEvil submit error: {e}")
        return None

    if data.get('status') != 1:
        logging.error(f"XEvil error: {data.get('request')}")
        return None

    captcha_id = data['request']
    logging.info(f"Captcha ID: {captcha_id}")

    # Poll for solution
    for attempt in range(24):
        time.sleep(5)
        try:
            check = requests.get(f"{cfg['xevil_api_url']}/res.php", params={
                'key': cfg['xevil_api_key'],
                'action': 'get',
                'id': captcha_id,
                'json': 1
            }, timeout=30).json()
        except Exception as e:
            logging.error(f"Polling error: {e}")
            continue

        if check.get('status') == 1:
            token = check['request']
            kawaii_success("Captcha solved!")
            return token
        if check.get('request') == 'ERROR_CAPTCHA_UNSOLVABLE':
            kawaii_error("Captcha unsolvable")
            return None
        
        if attempt % 4 == 0:  # Show progress every 20 seconds
            kawaii_print(f"Still solving... (attempt {attempt+1}/24)", "⏳")
    
    kawaii_error("Captcha timeout (2 minutes)")
    return None

# ===================== CLAIM FUNCTION =====================
def claim_beefaucet(cfg):
    """Main claim logic"""
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })

    # 1. Load page
    try:
        kawaii_print(f"Loading {cfg['faucet_url']}...", "🌐")
        resp = session.get(cfg['faucet_url'], timeout=30)
        resp.raise_for_status()
    except Exception as e:
        logging.error(f"Page load failed: {e}")
        return False

    soup = BeautifulSoup(resp.text, 'html.parser')

    # 2. Find captcha sitekey
    container = None
    if cfg['captcha_type'].lower() == 'hcaptcha':
        container = soup.find('div', class_='h-captcha')
    else:
        container = soup.find('div', class_='g-recaptcha')
    
    if not container:
        container = soup.find('div', attrs={'data-sitekey': True})
    
    if not container:
        kawaii_error("Captcha not found on page!")
        return False
    
    sitekey = container.get('data-sitekey')
    if not sitekey:
        kawaii_error("Sitekey is empty!")
        return False
    
    kawaii_print(f"Found sitekey: {sitekey[:20]}...", "🔑")

    # 3. Build form data
    form_data = {}
    target_form = None
    for frm in soup.find_all('form'):
        if (frm.find('div', class_='h-captcha') or 
            frm.find('div', class_='g-recaptcha') or 
            frm.find('div', attrs={'data-sitekey': True})):
            target_form = frm
            break
    
    if target_form:
        for inp in target_form.find_all('input', attrs={'name': True}):
            form_data[inp['name']] = inp.get('value', '')
    
    # Insert email
    if 'email' not in form_data and 'address' not in form_data:
        form_data['email'] = cfg['faucetpay_email']
    
    kawaii_print(f"Form fields: {list(form_data.keys())}", "📝")

    # 4. Solve captcha
    token = solve_captcha(sitekey, cfg['faucet_url'], cfg)
    if not token:
        return False

    form_data['h-captcha-response'] = token
    form_data['g-recaptcha-response'] = token

    # 5. Determine submit URL
    action = target_form.get('action') if target_form else ''
    if not action or action == '#':
        action = cfg['faucet_url']
    elif not action.startswith('http'):
        action = urllib.parse.urljoin(cfg['faucet_url'], action)

    # 6. Submit claim
    kawaii_print("Submitting claim...", "📤")
    try:
        post_resp = session.post(action, data=form_data, timeout=30)
        post_resp.raise_for_status()
    except Exception as e:
        logging.error(f"Claim POST failed: {e}")
        return False

    # 7. Check response
    text = post_resp.text.lower()
    
    if 'success' in text:
        kawaii_success("Claim SUCCESSFUL! 🍯💰")
        return True
    elif 'already claimed' in text or 'too soon' in text:
        kawaii_warning("Cooldown still active")
        return False
    elif 'invalid captcha' in text:
        kawaii_error("Captcha rejected by site")
        return False
    elif 'error' in text:
        kawaii_warning(f"Server returned error: {post_resp.text[:100]}")
        return False
    else:
        kawaii_print(f"Response: {post_resp.text[:150]}", "❓")
        return False

# ===================== STATISTICS =====================
class ClaimStats:
    def __init__(self):
        self.total_attempts = 0
        self.successful = 0
        self.failed = 0
        self.start_time = datetime.now()
    
    def add_success(self):
        self.total_attempts += 1
        self.successful += 1
    
    def add_fail(self):
        self.total_attempts += 1
        self.failed += 1
    
    def display(self):
        runtime = datetime.now() - self.start_time
        hours = runtime.seconds // 3600
        minutes = (runtime.seconds % 3600) // 60
        
        print(Fore.CYAN + Style.BRIGHT + f"""
    ╔══════════════════════════════════════════════════════╗
    ║              📊  SESSION STATISTICS  📊              ║
    ╠══════════════════════════════════════════════════════╣
    ║  Runtime: {hours}h {minutes}m                                    ║
    ║  Total Attempts: {self.total_attempts}                                    ║
    ║  Successful: {Fore.GREEN}{self.successful}{Fore.CYAN}                                   ║
    ║  Failed: {Fore.RED}{self.failed}{Fore.CYAN}                                       ║
    ║  Success Rate: {((self.successful/self.total_attempts)*100 if self.total_attempts > 0 else 0):.1f}%                             ║
    ╚══════════════════════════════════════════════════════╝
        """ + Style.RESET_ALL)

# ===================== MAIN LOOP =====================
def main():
    print_kawaii_banner()
    
    # Load or generate config
    cfg = load_config()
    
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format=f'{Fore.CYAN}%(asctime)s{Style.RESET_ALL} - %(levelname)s: %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # Initialize stats
    stats = ClaimStats()
    
    kawaii_print("Bot is starting! Press Ctrl+C to stop gracefully.", "🌸")
    print(Fore.MAGENTA + "─" * 60 + Style.RESET_ALL)
    
    try:
        while True:
            kawaii_print(f"Attempt #{stats.total_attempts + 1}", "🔄")
            
            success = claim_beefaucet(cfg)
            
            if success:
                stats.add_success()
                wait = random.randint(
                    cfg['min_claim_interval_seconds'], 
                    cfg['max_claim_interval_seconds']
                )
                kawaii_print(f"Next claim in {wait // 60}m {wait % 60}s...", "⏰")
            else:
                stats.add_fail()
                wait = 60
                kawaii_print("Retrying in 60s...", "⏳")
            
            # Show stats every 5 attempts
            if stats.total_attempts % 5 == 0:
                stats.display()
            
            print(Fore.MAGENTA + "─" * 60 + Style.RESET_ALL)
            time.sleep(wait)
    
    except KeyboardInterrupt:
        print("\n")
        kawaii_print("Shutting down gracefully...", "👋")
        stats.display()
        kawaii_success(f"Session ended. Collected {stats.successful} times! 💰")
        kawaii_print("See you next time! (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "🌸")
        
        # Save session report
        report = f"""
🌸 Mayiro Beefaucet Session Report
{'='*40}
Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Runtime: {datetime.now() - stats.start_time}
Total Attempts: {stats.total_attempts}
Successful: {stats.successful}
Failed: {stats.failed}
Success Rate: {((stats.successful/stats.total_attempts)*100 if stats.total_attempts > 0 else 0):.1f}%

🌸 Thanks for using Mayiro Fairy!
"""
        with open("session_report.txt", "w") as f:
            f.write(report)

if __name__ == "__main__":
    main()
