// The amount of Toncoin earned per ad watched.
export const REWARD_PER_AD = 0.0005;

// The minimum amount of Toncoin required for a withdrawal request.
export const MINIMUM_WITHDRAWAL = 0.05;

// The duration of the simulated ad in seconds.
export const AD_DURATION_SECONDS = 15;

// The bonus amount credited to a referrer when their referred user watches their first ad.
export const REFERRAL_BONUS_FOR_REFERRER = 0.01;

// The bonus amount a new user receives for joining via a referral link.
export const REFERRAL_BONUS_FOR_REFERRED = 0.005;


/**
 * IMPORTANT: This is the Webhook URL for services like Pipedream or Zapier.
 * This URL is used to send withdrawal request notifications.
 * 
 * How to get a Pipedream Webhook URL:
 * 1. Create a new workflow in Pipedream.
 * 2. For the trigger, select "HTTP / Webhook".
 * 3. Choose the "HTTP Requests (Payloads only)" option.
 * 4. Pipedream will provide you with a custom webhook URL. Copy it and paste it here.
 * 5. Set up the action in Pipedream (e.g., "Send Email") to use the data from the webhook.
 */
export const WEBHOOK_URL = 'https://eos5yjgvkh1gbmh.m.pipedream.net';