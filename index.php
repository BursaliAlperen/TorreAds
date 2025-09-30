<?php
// TorreAds Bot - Webhook Sistemi
header('Content-Type: application/json');

// Bot configuration
define('BOT_TOKEN', getenv('BOT_TOKEN') ?: 'YOUR_BOT_TOKEN_HERE');
define('API_URL', 'https://api.telegram.org/bot' . BOT_TOKEN . '/');
define('USERS_FILE', 'users.json');
define('ERROR_LOG', 'error.log');
define('MIN_WITHDRAWAL', 0.01);
define('REFERRAL_BONUS', 0.005);
define('AD_EARNINGS', 0.0005);
define('DAILY_LIMIT', 50);
define('API_SECRET', 'torreads_secret_2024');

// Error logging
function logError($message) {
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents(ERROR_LOG, "[$timestamp] ERROR: $message\n", FILE_APPEND);
    error_log($message); // Render log için
}

function logMessage($message) {
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents(ERROR_LOG, "[$timestamp] INFO: $message\n", FILE_APPEND);
    error_log($message); // Render log için
}

// Data management
function loadUsers() {
    try {
        if (!file_exists(USERS_FILE)) {
            file_put_contents(USERS_FILE, json_encode([]));
            chmod(USERS_FILE, 0666);
        }
        $data = json_decode(file_get_contents(USERS_FILE), true) ?: [];
        return $data;
    } catch (Exception $e) {
        logError("Load users failed: " . $e->getMessage());
        return [];
    }
}

function saveUsers($users) {
    try {
        file_put_contents(USERS_FILE, json_encode($users, JSON_PRETTY_PRINT));
        return true;
    } catch (Exception $e) {
        logError("Save users failed: " . $e->getMessage());
        return false;
    }
}

// Send message to Telegram
function sendMessage($chat_id, $text, $keyboard = null, $parse_mode = 'HTML') {
    try {
        $params = [
            'chat_id' => $chat_id,
            'text' => $text,
            'parse_mode' => $parse_mode
        ];
        
        if ($keyboard) {
            $params['reply_markup'] = json_encode([
                'inline_keyboard' => $keyboard
            ]);
        }
        
        $url = API_URL . 'sendMessage';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        $response = curl_exec($ch);
        curl_close($ch);
        
        return true;
    } catch (Exception $e) {
        logError("Send message failed for chat $chat_id: " . $e->getMessage());
        return false;
    }
}

// Answer callback query
function answerCallback($callback_id, $text = null) {
    try {
        $params = ['callback_query_id' => $callback_id];
        if ($text) $params['text'] = $text;
        
        $url = API_URL . 'answerCallbackQuery';
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
        
        return true;
    } catch (Exception $e) {
        logError("Answer callback failed: " . $e->getMessage());
        return false;
    }
}

// Main keyboard
function getMainKeyboard() {
    return [
        [
            ['text' => '📱 Reklam İzle', 'web_app' => ['url' => 'https://torreads.onrender.com/mini-app.html']],
            ['text' => '💰 Bakiye', 'callback_data' => 'balance']
        ],
        [
            ['text' => '👥 Referans', 'callback_data' => 'referrals'],
            ['text' => '💳 Para Çek', 'callback_data' => 'withdraw']
        ],
        [
            ['text' => '📊 İstatistik', 'callback_data' => 'stats'],
            ['text' => 'ℹ️ Yardım', 'callback_data' => 'help']
        ]
    ];
}

// Check daily limit
function checkDailyLimit($user_id) {
    $users = loadUsers();
    $today = date('Y-m-d');
    
    if (!isset($users[$user_id]['daily_stats'])) {
        $users[$user_id]['daily_stats'] = [];
    }
    
    if (!isset($users[$user_id]['daily_stats'][$today])) {
        $users[$user_id]['daily_stats'][$today] = [
            'ads_watched' => 0,
            'earned_today' => 0
        ];
    }
    
    $daily = $users[$user_id]['daily_stats'][$today];
    return $daily;
}

// Process /start command
function processStart($chat_id, $first_name, $ref_code = null) {
    $users = loadUsers();
    
    // Create new user if doesn't exist
    if (!isset($users[$chat_id])) {
        $users[$chat_id] = [
            'balance' => 0,
            'total_earned' => 0,
            'total_withdrawn' => 0,
            'watch_count' => 0,
            'ref_code' => substr(md5($chat_id . time()), 0, 8),
            'referred_by' => null,
            'daily_stats' => [],
            'withdrawals' => [],
            'created_at' => date('Y-m-d H:i:s')
        ];
        logMessage("New user created: $chat_id ($first_name)");
    }
    
    // Referans kontrolü
    if ($ref_code && !$users[$chat_id]['referred_by']) {
        foreach ($users as $id => $user) {
            if (isset($user['ref_code']) && $user['ref_code'] === $ref_code && $id != $chat_id) {
                $users[$chat_id]['referred_by'] = $id;
                $users[$id]['balance'] += REFERRAL_BONUS;
                
                // Referans verene bildirim gönder
                sendMessage($id, 
                    "🎉 Yeni referansınız var!\n" .
                    "+" . REFERRAL_BONUS . " TON bonus kazandınız!\n" .
                    "Yeni bakiyeniz: " . $users[$id]['balance'] . " TON"
                );
                break;
            }
        }
    }
    
    saveUsers($users);
    
    $msg = "🏰 *TorreAds'e Hoş Geldiniz!* 👋\n\n" .
           "*$first_name*, TON kazanma maceranız başlıyor! 🎉\n\n" .
           "📱 *Mini App ile reklam izleyin*\n" .
           "👥 *Arkadaşlarınızı davet edin*\n" .
           "💎 *Kazançlarınızı TON cinsinden çekin*\n\n" .
           "Reklam başı: *" . AD_EARNINGS . " TON*\n" .
           "Referans başı: *" . REFERRAL_BONUS . " TON*\n\n" .
           "Hemen başlamak için aşağıdaki butonları kullanın! ⬇️";
    
    sendMessage($chat_id, $msg, getMainKeyboard());
    return true;
}

// Process callback queries
function processCallback($callback) {
    $chat_id = $callback['message']['chat']['id'];
    $message_id = $callback['message']['message_id'];
    $data = $callback['data'];
    $callback_id = $callback['id'];
    
    $users = loadUsers();
    
    if (!isset($users[$chat_id])) {
        processStart($chat_id, "User");
        $users = loadUsers();
    }
    
    answerCallback($callback_id);
    
    $daily = checkDailyLimit($chat_id);
    
    switch ($data) {
        case 'balance':
            $msg = "💰 *Bakiye Bilgileri*\n\n" .
                   "💎 Mevcut Bakiye: *" . number_format($users[$chat_id]['balance'], 6) . " TON*\n" .
                   "📈 Toplam Kazanç: *" . number_format($users[$chat_id]['total_earned'], 6) . " TON*\n" .
                   "💸 Toplam Çekim: *" . number_format($users[$chat_id]['total_withdrawn'], 6) . " TON*\n" .
                   "🎬 İzlenen Reklam: *" . $users[$chat_id]['watch_count'] . "*\n\n" .
                   "📅 Bugünkü Kazanç: *" . number_format($daily['earned_today'], 6) . " TON*\n" .
                   "⚡ Günlük Limit: " . $daily['ads_watched'] . "/" . DAILY_LIMIT . " reklam\n\n" .
                   "💡 Minimum çekim: *" . MIN_WITHDRAWAL . " TON*";
            break;
            
        case 'referrals':
            $ref_count = 0;
            foreach ($users as $user) {
                if (isset($user['referred_by']) && $user['referred_by'] == $chat_id) {
                    $ref_count++;
                }
            }
            
            $ref_link = "https://t.me/TorreAds_Bot?start=" . $users[$chat_id]['ref_code'];
            
            $msg = "👥 *Referans Sistemimiz*\n\n" .
                   "🔗 *Referans Linkiniz:*\n" .
                   "`" . $ref_link . "`\n\n" .
                   "📊 *Referans İstatistikleri:*\n" .
                   "• Toplam Referans: *" . $ref_count . " kişi*\n" .
                   "• Referans Bonusu: *" . REFERRAL_BONUS . " TON*\n\n" .
                   "🎁 *Referans Kazançları:*\n" .
                   "• Her referans için: 🎉 " . REFERRAL_BONUS . " TON bonus\n" .
                   "• Referanslarının kazancından: 💰 %10 komisyon\n" .
                   "• Limit yok: 🚀 sınırsız referans\n\n" .
                   "💡 Linkinizi paylaşın, hem bonus hem komisyon kazanın!";
            break;
            
        case 'stats':
            $total_users = count($users);
            $total_ads = 0;
            $total_ton = 0;
            
            foreach ($users as $user) {
                $total_ads += $user['watch_count'] ?? 0;
                $total_ton += $user['total_earned'] ?? 0;
            }
            
            $msg = "📊 *TorreAds İstatistikleri*\n\n" .
                   "👥 Toplam Kullanıcı: *$total_users*\n" .
                   "🎬 Toplam İzlenen Reklam: *$total_ads*\n" .
                   "💎 Toplam Dağıtılan TON: *" . number_format($total_ton, 6) . " TON*\n\n" .
                   "👤 *Kişisel İstatistikler:*\n" .
                   "• Toplam Kazanç: *" . number_format($users[$chat_id]['total_earned'], 6) . " TON*\n" .
                   "• İzlenen Reklam: *" . $users[$chat_id]['watch_count'] . "*\n" .
                   "• Bugün: *" . $daily['ads_watched'] . "/" . DAILY_LIMIT . " reklam*\n" .
                   "• Toplam Çekim: *" . number_format($users[$chat_id]['total_withdrawn'], 6) . " TON*\n\n" .
                   "🏰 *TorreAds - Güvenilir TON Kazanç Platformu*";
            break;
            
        case 'help':
            $msg = "ℹ️ *TorreAds Yardım Merkezi*\n\n" .
                   "📱 *Mini App ile Reklam İzleme*\n" .
                   "1. 'Reklam İzle' butonuna tıklayın\n" .
                   "2. Mini App'te reklamı izleyin\n" .
                   "3. Otomatik olarak *" . AD_EARNINGS . " TON* kazanın\n\n" .
                   "👥 *Referans Sistemi*\n" .
                   "• Her referans: *" . REFERRAL_BONUS . " TON* bonus\n" .
                   "• Referans kazancı: *%10* komisyon\n" .
                   "• Sınırsız referans hakkı\n\n" .
                   "💳 *Para Çekme*\n" .
                   "• Minimum: *" . MIN_WITHDRAWAL . " TON*\n" .
                   "• TON cüzdan adresi gerekiyor\n" .
                   "• 24 saat içinde ödeme\n\n" .
                   "📅 *Limitler*\n" .
                   "• Günlük: *" . DAILY_LIMIT . "* reklam\n" .
                   "• Reklam başı: *" . AD_EARNINGS . " TON*\n\n" .
                   "❓ Sorularınız için: @TorreAdsSupport";
            break;
            
        default:
            $msg = "🏰 *TorreAds - TON Kazanma Botu* 🏰\n\n" .
                   "💰 *Bakiye:* " . number_format($users[$chat_id]['balance'], 6) . " TON\n" .
                   "📊 *Toplam Kazanç:* " . number_format($users[$chat_id]['total_earned'], 6) . " TON\n" .
                   "🎬 *İzlenen Reklam:* " . $users[$chat_id]['watch_count'] . "\n" .
                   "📅 *Bugün:* " . $daily['ads_watched'] . "/" . DAILY_LIMIT . " reklam\n\n" .
                   "💎 *Minimum Çekim:* " . MIN_WITHDRAWAL . " TON\n" .
                   "⚡ *Günlük Limit:* " . DAILY_LIMIT . " reklam";
            break;
    }
    
    sendMessage($chat_id, $msg, getMainKeyboard());
    return true;
}

// Webhook processing
function processWebhook($update) {
    logMessage("Webhook received: " . json_encode($update));
    
    if (isset($update['message'])) {
        $message = $update['message'];
        $chat_id = $message['chat']['id'];
        $text = trim($message['text'] ?? '');
        $first_name = $message['chat']['first_name'] ?? 'User';
        
        if (strpos($text, '/start') === 0) {
            $parts = explode(' ', $text);
            $ref_code = $parts[1] ?? null;
            processStart($chat_id, $first_name, $ref_code);
        }
        
    } elseif (isset($update['callback_query'])) {
        processCallback($update['callback_query']);
    }
    
    return true;
}

// Set webhook
function setWebhook() {
    $webhook_url = 'https://torreads.onrender.com/webhook';
    $url = API_URL . 'setWebhook?url=' . urlencode($webhook_url);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    curl_close($ch);
    
    logMessage("Webhook set: $webhook_url");
    return $response;
}

// Health check
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    echo json_encode([
        'status' => 'OK',
        'timestamp' => date('Y-m-d H:i:s'),
        'service' => 'TorreAds Bot',
        'webhook' => 'active'
    ]);
    exit;
}

// Set webhook endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['setwebhook'])) {
    $result = setWebhook();
    echo "Webhook set: " . $result;
    exit;
}

// Webhook endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['webhook'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if ($input) {
        processWebhook($input);
    }
    
    echo 'OK';
    exit;
}

// Manual webhook test
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['test'])) {
    $test_data = [
        'update_id' => 100000000,
        'message' => [
            'message_id' => 1,
            'chat' => [
                'id' => 123456789, // YOUR_CHAT_ID buraya kendi chat ID'nizi yazın
                'first_name' => 'Test',
                'type' => 'private'
            ],
            'text' => '/start',
            'date' => time()
        ]
    ];
    
    processWebhook($test_data);
    echo "Test message sent!";
    exit;
}

// Default response
echo "🏰 TorreAds Bot is running!\n";
echo "📅 " . date('Y-m-d H:i:s') . "\n";
echo "🔗 Webhook: https://torreads.onrender.com/webhook\n";
echo "❤️ Health: https://torreads.onrender.com/health\n";
echo "⚙️ Set Webhook: https://torreads.onrender.com/setwebhook\n";
?>
