
/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param input The input string to sanitize
 * @returns Sanitized string with HTML entities escaped
 */
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate email format
 * @param email Email string to validate
 * @returns True if email format is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
};

/**
 * Validate phone number format
 * @param phone Phone number string to validate
 * @returns True if phone format is valid
 */
export const isValidPhone = (phone: string): boolean => {
  if (typeof phone !== 'string') {
    return false;
  }
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (7-15 digits as per E.164)
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

/**
 * Validate and sanitize text input
 * @param input Text input to validate
 * @param maxLength Maximum allowed length
 * @param allowHtml Whether to allow HTML (default: false)
 * @returns Sanitized and validated text
 */
export const validateTextInput = (
  input: string, 
  maxLength: number = 1000, 
  allowHtml: boolean = false
): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Trim whitespace
  let sanitized = input.trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Sanitize HTML if not allowed
  if (!allowHtml) {
    sanitized = sanitizeHtml(sanitized);
  }
  
  return sanitized;
};

/**
 * Validate password strength
 * @param password Password to validate
 * @returns Object with validation result and requirements
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
  };
  score: number; // 0-5
} => {
  if (typeof password !== 'string') {
    return {
      isValid: false,
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSymbol: false,
      },
      score: 0
    };
  }
  
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
  };
  
  const score = Object.values(requirements).filter(Boolean).length;
  const isValid = score >= 4 && requirements.minLength; // Require at least 4 criteria including min length
  
  return {
    isValid,
    requirements,
    score
  };
};

/**
 * Validate numeric input
 * @param input Input to validate
 * @param min Minimum value (optional)
 * @param max Maximum value (optional)
 * @returns Object with validation result and parsed number
 */
export const validateNumericInput = (
  input: string | number, 
  min?: number, 
  max?: number
): { isValid: boolean; value: number | null; error?: string } => {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num)) {
    return { isValid: false, value: null, error: 'Invalid number format' };
  }
  
  if (min !== undefined && num < min) {
    return { isValid: false, value: null, error: `Value must be at least ${min}` };
  }
  
  if (max !== undefined && num > max) {
    return { isValid: false, value: null, error: `Value must be at most ${max}` };
  }
  
  return { isValid: true, value: num };
};
