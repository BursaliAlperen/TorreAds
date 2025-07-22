import { WEBHOOK_URL } from '../constants';

/**
 * Sends withdrawal request data to a Webhook (e.g., Pipedream).
 * @param address The Toncoin address for the withdrawal.
 * @param amount The amount of Toncoin to withdraw.
 */
export const sendWithdrawalNotification = async (address: string, amount: number): Promise<void> => {
  // This check is for a placeholder URL to prevent errors during development if the URL isn't set.
  if (!WEBHOOK_URL || WEBHOOK_URL.includes('your-webhook-url-goes-here')) {
    console.warn('Webhook URL is not configured or is a placeholder. Skipping notification.');
    // To avoid errors in the demo, we'll resolve successfully.
    // In a real app, you might want to throw an error here.
    return Promise.resolve(); 
  }

  const payload = {
    ton_address: address,
    withdrawal_amount: amount,
    request_date: new Date().toISOString(),
  };

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook failed with status ${response.status}`);
  }
};
