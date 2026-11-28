export const UZ_PHONE_PREFIX = '+998 ';
export const UZ_PHONE_LOCAL_LENGTH = 9;

/**
 * Strips leading @ symbols and optional t.me/telegram.me URL prefixes,
 * returning only valid Telegram username characters (max 32).
 */
export const stripTelegramPrefix = (rawValue = '') => {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return '';

  const withoutUrl = trimmed.replace(
    /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\//i,
    ''
  );
  const withoutAt = withoutUrl.replace(/^@+/, '');
  return withoutAt.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 32);
};

/**
 * Formats a Telegram username input value with a single leading '@'.
 */
export const formatTelegramUsernameInput = (
  rawValue = '',
  { keepPrefixWhenEmpty = true } = {}
) => {
  const username = stripTelegramPrefix(rawValue);
  if (!username) {
    return keepPrefixWhenEmpty ? '@' : '';
  }
  return `@${username}`;
};

/**
 * Normalizes a Telegram username for the backend API (stored without '@', or null if empty).
 */
export const normalizeTelegramUsernameForApi = (rawValue = '') => {
  const username = stripTelegramPrefix(rawValue);
  return username || null;
};

/**
 * Extracts up to 9 local digits after the +998 country prefix.
 */
export const extractUzbekPhoneLocalDigits = (rawValue = '') => {
  const text = String(rawValue ?? '');
  if (!text) return '';

  const prefixMatch = text.match(/^\+?998\s?(.*)$/);
  if (prefixMatch) {
    let remainderDigits = prefixMatch[1].replace(/\D/g, '');
    if (remainderDigits.length > UZ_PHONE_LOCAL_LENGTH && remainderDigits.startsWith('998')) {
      remainderDigits = remainderDigits.slice(3);
    }
    return remainderDigits.slice(0, UZ_PHONE_LOCAL_LENGTH);
  }

  let digits = text.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('998') && (digits.length > UZ_PHONE_LOCAL_LENGTH || text.trim().startsWith('+'))) {
    digits = digits.slice(3);
  }
  return digits.slice(0, UZ_PHONE_LOCAL_LENGTH);
};

/**
 * Formats an Uzbek phone number for input editing as "+998 XX XXX XX XX".
 */
export const formatUzbekPhoneInput = (rawValue = '') => {
  const digits = extractUzbekPhoneLocalDigits(rawValue);
  const parts = [
    digits.slice(0, 2),
    digits.slice(2, 5),
    digits.slice(5, 7),
    digits.slice(7, 9),
  ].filter(Boolean);

  return `${UZ_PHONE_PREFIX}${parts.join(' ')}`;
};

/**
 * Formats a stored phone number for read-only display when it is a full +998 number.
 */
export const formatUzbekPhoneDisplay = (rawValue = '') => {
  const text = String(rawValue ?? '').trim();
  if (!text) return '';

  const digits = text.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return formatUzbekPhoneInput(digits);
  }
  return text;
};

/**
 * Normalizes an Uzbek phone number for the backend API ("+998XXXXXXXXX").
 */
export const normalizeUzbekPhoneForApi = (rawValue = '') => {
  const digits = extractUzbekPhoneLocalDigits(rawValue);
  return digits ? `+998${digits}` : '';
};

/**
 * Checks whether the phone value contains a complete 9-digit Uzbek mobile number.
 */
export const isValidUzbekPhone = (rawValue = '') =>
  extractUzbekPhoneLocalDigits(rawValue).length === UZ_PHONE_LOCAL_LENGTH;

/**
 * Converts an ISO date ("YYYY-MM-DD") to display format ("DD.MM.YYYY").
 */
export const isoToDisplayDate = (isoDate = '') => {
  const match = String(isoDate ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  return `${match[3]}.${match[2]}.${match[1]}`;
};

/**
 * Validates whether day/month/year form a real calendar date within bounds.
 */
export const isValidCalendarDate = (
  day,
  month,
  year,
  { minYear = 1900, maxYear = new Date().getFullYear(), allowFuture = false } = {}
) => {
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    year < minYear ||
    year > maxYear ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return false;
  }

  if (!allowFuture) {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    if (candidate > todayEnd) return false;
  }

  return true;
};

/**
 * Filters raw date digits for DDMMYYYY while blocking invalid day/month sequences (e.g. 00, 32+, 13+).
 */
const filterDateDigits = (rawDigits = '') => {
  const accepted = [];

  for (let i = 0; i < rawDigits.length && accepted.length < 8; i += 1) {
    const digit = rawDigits[i];
    const pos = accepted.length;

    if (pos === 0) {
      if (digit > '3') break;
      accepted.push(digit);
    } else if (pos === 1) {
      const d1 = accepted[0];
      if (d1 === '0' && digit === '0') break;
      if (d1 === '3' && digit > '1') break;
      accepted.push(digit);
    } else if (pos === 2) {
      if (digit > '1') break;
      accepted.push(digit);
    } else if (pos === 3) {
      const m1 = accepted[2];
      if (m1 === '0' && digit === '0') break;
      if (m1 === '1' && digit > '2') break;
      accepted.push(digit);
    } else if (pos === 4) {
      if (digit !== '1' && digit !== '2') break;
      accepted.push(digit);
    } else {
      accepted.push(digit);
    }
  }

  return accepted.join('');
};

/**
 * Formats a DD.MM.YYYY date input while keeping "." separators automatic and guarding invalid day/month digits.
 */
export const formatDateInput = (rawValue = '', previousDisplayValue = '') => {
  const text = String(rawValue ?? '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const converted = `${isoMatch[3]}${isoMatch[2]}${isoMatch[1]}`;
    const validDigits = filterDateDigits(converted);
    if (validDigits.length === 8) {
      return `${validDigits.slice(0, 2)}.${validDigits.slice(2, 4)}.${validDigits.slice(4, 8)}`;
    }
  }

  const rawDigits = String(rawValue ?? '').replace(/\D/g, '').slice(0, 8);
  const digits = filterDateDigits(rawDigits);
  const isDeleting = String(rawValue ?? '').length < String(previousDisplayValue ?? '').length;

  // Reject invalid newly typed digit instead of scrambling remaining characters
  if (!isDeleting && digits.length < rawDigits.length && previousDisplayValue) {
    return previousDisplayValue;
  }

  if (digits.length === 0) return '';
  if (digits.length === 1) return digits;
  if (digits.length === 2) {
    return isDeleting ? digits : `${digits}.`;
  }
  if (digits.length === 3) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  if (digits.length === 4) {
    const base = `${digits.slice(0, 2)}.${digits.slice(2, 4)}`;
    return isDeleting ? base : `${base}.`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
};

/**
 * Parses a DD.MM.YYYY display string into an ISO YYYY-MM-DD string if valid, otherwise returns null.
 */
export const parseDisplayDateToIso = (displayValue = '', options = {}) => {
  const match = String(displayValue ?? '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidCalendarDate(day, month, year, options)) return null;

  return `${match[3]}-${match[2]}-${match[1]}`;
};

/**
 * Normalizes either a DD.MM.YYYY or YYYY-MM-DD date string to YYYY-MM-DD (or null if empty/invalid).
 */
export const normalizeDateForApi = (rawValue = '', options = {}) => {
  const text = String(rawValue ?? '').trim();
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return isValidCalendarDate(day, month, year, options) ? text : null;
  }

  return parseDisplayDateToIso(text, options);
};
