/**
 * Arovia Hospital Contact Verification and Dialer Utility
 * 
 * Enforces strict phone verification rules:
 * - Reject emergency numbers (108, 112) masquerading as hospital switchboard numbers.
 * - Reject placeholder or fabricated numbers (e.g. repeating patterns, 2800 108 108).
 * - Validate genuine Indian landline / healthcare switchboard numbers.
 */

export function isValidHospitalPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();

  // 1. Strictly reject national emergency numbers
  const emergencyNumbers = ['108', '112', '100', '101', '102', '911', '0'];
  if (emergencyNumbers.includes(trimmed)) return false;

  // 2. Strictly reject placeholder, demo, or repeating patterns
  const invalidPatterns = [
    '108 108',
    '2800 108',
    '123456',
    '000000',
    '111111',
    '999999',
    'unknown',
    'n/a',
    'none',
  ];
  if (invalidPatterns.some((pattern) => trimmed.toLowerCase().includes(pattern))) {
    return false;
  }

  // 3. Check digit count (Indian landlines with STD code or mobiles: 8 to 13 digits)
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 13) {
    return false;
  }

  return true;
}

/**
 * Format phone string safely for the device's native dialer URI (tel:)
 */
export function cleanDialerPhone(phone) {
  if (!isValidHospitalPhone(phone)) return null;
  return phone.replace(/[^0-9+]/g, '');
}

