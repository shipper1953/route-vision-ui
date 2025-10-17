/**
 * Utility functions for EasyPost integration
 */

/**
 * Detects if using EasyPost test mode or production mode
 * Test keys start with EZTEST, production keys start with EZAK
 */
export function isEasyPostTestMode(apiKey?: string): boolean {
  if (!apiKey) return true; // Assume test mode if no key
  return apiKey.startsWith('EZTEST');
}

/**
 * Gets a user-friendly description of the current EasyPost mode
 */
export function getEasyPostModeDescription(isTestMode: boolean): string {
  return isTestMode 
    ? 'Test Mode (Limited ZPL Support)' 
    : 'Production Mode (Full ZPL Support)';
}
