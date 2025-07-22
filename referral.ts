/**
 * Generates a random alphanumeric string to be used as a referral code.
 * @param length The desired length of the code.
 * @returns A random referral code.
 */
const generateReferralCode = (length: number = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

/**
 * Retrieves the user's referral code from local storage.
 * If a code doesn't exist, it generates a new one and stores it.
 * @returns The user's referral code.
 */
export const getReferralCode = (): string => {
  try {
    const existingCode = localStorage.getItem('referralCode');
    if (existingCode) {
      return existingCode;
    }
    const newCode = generateReferralCode();
    localStorage.setItem('referralCode', newCode);
    return newCode;
  } catch (error) {
    console.error("Could not access local storage for referral code:", error);
    // Return a temporary code if local storage is disabled
    return generateReferralCode();
  }
};
