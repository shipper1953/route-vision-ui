
/**
 * Secure password generation utility using Web Crypto API
 */

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * Generate a cryptographically secure random password
 * @param length Password length (minimum 8)
 * @param includeSymbols Whether to include special symbols
 * @returns Secure random password
 */
export const generateSecurePassword = (length: number = 12, includeSymbols: boolean = true): string => {
  if (length < 8) {
    throw new Error('Password length must be at least 8 characters');
  }

  const charset = UPPERCASE + LOWERCASE + NUMBERS + (includeSymbols ? SYMBOLS : '');
  const array = new Uint8Array(length);
  
  // Use Web Crypto API for secure random generation
  crypto.getRandomValues(array);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  // Ensure password contains at least one character from each required set
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = includeSymbols ? /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) : true;
  
  // If password doesn't meet complexity requirements, regenerate
  if (!hasUpper || !hasLower || !hasNumber || !hasSymbol) {
    return generateSecurePassword(length, includeSymbols);
  }
  
  return password;
};

/**
 * Generate a secure random string for tokens, IDs, etc.
 * @param length Length of the random string
 * @returns Secure random string (base64url encoded)
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  // Convert to base64url (URL-safe base64)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};
