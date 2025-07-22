
import { WEBHOOK_URL } from '../constants';

/**
 * Sends withdrawal request data to a configured Webhook endpoint (e.g., Pipedream).
 * This service is responsible for notifying a backend or a service automation platform
 * about a user's withdrawal request.
 *
 * @param address The Toncoin wallet address for the withdrawal.
 * @param amount The amount of Toncoin to withdraw.
 */
export const sendWithdrawalNotification = async (address: string, amount: number): Promise<void> => {
  // This check prevents errors during development if the URL hasn't been set.
  if (!WEBHOOK_URL || WEBHOOK_URL.includes('your-webhook-url-goes-here')) {
    console.warn('Webhook URL is not configured. Skipping notification.');
    // In a real app, you might throw an error here. For this demo, we resolve successfully
    // to not block the UI flow.
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
    // In a production app, you might want more sophisticated error handling,
    // like parsing the response body for an error message.
    throw new Error(`Webhook request failed with status ${response.status}`);
  }
};
