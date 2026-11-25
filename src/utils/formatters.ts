import type { AppLanguage } from '../types/models';

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
};

const EN_BANGLA_REVERSE_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const BN_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

const BN_WEEKDAYS = [
  'রবিবার',
  'সোমবার',
  'মঙ্গলবার',
  'বুধবার',
  'বৃহস্পতিবার',
  'শুক্রবার',
  'শনিবার',
];

const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function convertToBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BANGLA_DIGIT_MAP[d] ?? d);
}

export function normalizeBanglaDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => EN_BANGLA_REVERSE_MAP[d] ?? d);
}

export function localizeDigits(value: string | number, language: AppLanguage): string {
  const str = String(value);
  return language === 'BANGLA' ? convertToBanglaDigits(str) : str;
}

/**
 * Formats integer string with South Asian (BDT/INR) comma grouping:
 * 1000 -> 1,000 | 10000 -> 10,000 | 100000 -> 1,00,000 | 1234567 -> 12,34,567
 */
export function formatSouthAsianGrouping(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const lastThree = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${groupedRest},${lastThree}`;
}

export function formatCurrency(
  amount: number,
  currencySymbol = '৳',
  language: AppLanguage = 'ENGLISH',
  showSign = false,
  compactDecimals = true
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNeg = safe < 0;
  const abs = Math.abs(safe);

  const rounded = Math.round(abs * 100) / 100;
  const isWhole = Math.abs(rounded - Math.round(rounded)) < 0.005;

  const fixed = isWhole && compactDecimals ? String(Math.round(rounded)) : rounded.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = formatSouthAsianGrouping(intPart);
  const numericBody = decPart ? `${formattedInt}.${decPart}` : formattedInt;

  const prefix = isNeg ? '-' : showSign && rounded > 0 ? '+' : '';
  const combined = `${prefix}${currencySymbol}${numericBody}`;
  return language === 'BANGLA' ? convertToBanglaDigits(combined) : combined;
}

export function formatCompactCurrency(
  amount: number,
  currencySymbol = '৳',
  language: AppLanguage = 'ENGLISH'
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNeg = safe < 0;
  const abs = Math.abs(safe);
  const prefix = isNeg ? '-' : '';

  let body: string;
  if (abs >= 10_000_000) {
    const val = (abs / 10_000_000).toFixed(1).replace(/\.0$/, '');
    body = language === 'BANGLA' ? `${val} কোটি` : `${val}Cr`;
  } else if (abs >= 100_000) {
    const val = (abs / 100_000).toFixed(1).replace(/\.0$/, '');
    body = language === 'BANGLA' ? `${val} লাখ` : `${val}L`;
  } else if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
    body = `${val}k`;
  } else {
    body = String(Math.round(abs));
  }

  const res = `${prefix}${currencySymbol}${body}`;
  return language === 'BANGLA' ? convertToBanglaDigits(res) : res;
}

export function formatTime(timestamp: number, language: AppLanguage = 'ENGLISH'): string {
  const d = new Date(timestamp);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const isPm = hours >= 12;
  hours = hours % 12 || 12;
  const amPm = language === 'BANGLA' ? (isPm ? 'অপরাহ্ণ' : 'পূর্বাহ্ণ') : isPm ? 'PM' : 'AM';
  const str = `${hours}:${minutes} ${amPm}`;
  return language === 'BANGLA' ? convertToBanglaDigits(str) : str;
}

export function formatShortDate(timestamp: number, language: AppLanguage = 'ENGLISH'): string {
  const d = new Date(timestamp);
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  if (language === 'BANGLA') {
    return convertToBanglaDigits(`${day} ${BN_MONTHS[monthIdx]}, ${year}`);
  }
  return `${day} ${EN_MONTHS_SHORT[monthIdx]}, ${year}`;
}

export function formatDayHeader(timestamp: number, language: AppLanguage = 'ENGLISH'): string {
  const d = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  if (startOfTarget === startOfToday) {
    return language === 'BANGLA' ? 'আজ' : 'Today';
  }
  if (startOfTarget === startOfYesterday) {
    return language === 'BANGLA' ? 'গতকাল' : 'Yesterday';
  }

  const day = d.getDate();
  const monthIdx = d.getMonth();
  const year = d.getFullYear();
  if (language === 'BANGLA') {
    const weekday = BN_WEEKDAYS[d.getDay()];
    return convertToBanglaDigits(`${weekday}, ${day} ${BN_MONTHS[monthIdx]} ${year}`);
  }
  const enWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${enWeekdays[d.getDay()]}, ${day} ${EN_MONTHS_SHORT[monthIdx]} ${year}`;
}

export function formatMonthYear(year: number, monthIndex0: number, language: AppLanguage = 'ENGLISH'): string {
  const safeMonth = ((monthIndex0 % 12) + 12) % 12;
  if (language === 'BANGLA') {
    return convertToBanglaDigits(`${BN_MONTHS[safeMonth]} ${year}`);
  }
  return `${EN_MONTHS_FULL[safeMonth]} ${year}`;
}

export function formatDateTime(timestamp: number, language: AppLanguage = 'ENGLISH'): string {
  return `${formatShortDate(timestamp, language)} • ${formatTime(timestamp, language)}`;
}

export function formatBytes(bytes: number, language: AppLanguage = 'ENGLISH'): string {
  const str =
    bytes < 1024
      ? `${bytes} B`
      : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return language === 'BANGLA' ? convertToBanglaDigits(str) : str;
}

export function getMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
