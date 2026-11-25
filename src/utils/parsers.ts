import type { AccountEntity, CategoryEntity, TransactionType } from '../types/models';
import { normalizeBanglaDigits } from './formatters';

export interface ParsedVoiceTransaction {
  rawText: string;
  amount: number;
  type: TransactionType;
  categoryName: string;
  subcategoryName: string;
  matchedAccountId: string | null;
  matchedToAccountId: string | null;
  description: string;
  hasConfidentAmount: boolean;
  hasConfidentCategory: boolean;
  hasConfidentAccount: boolean;
  hasConfidentDescription: boolean;
}

const BANGLA_NUMBER_WORDS: Array<[string, string]> = [
  ['দশ হাজার', '10000'],
  ['পাঁচ হাজার', '5000'],
  ['দুই হাজার', '2000'],
  ['এক হাজার', '1000'],
  ['হাজার', '1000'],
  ['নয়শো', '900'], ['নয়শো', '900'], ['নয়শ', '900'],
  ['আটশো', '800'], ['আটশ', '800'],
  ['সাতশো', '700'], ['সাতশ', '700'],
  ['ছয়শো', '600'], ['ছয়শো', '600'], ['ছয়শ', '600'],
  ['পাঁচশো', '500'], ['পাঁচশ', '500'],
  ['চারশো', '400'], ['চারশ', '400'],
  ['তিনশো', '300'], ['তিনশ', '300'],
  ['দুইশো', '200'], ['দুইশ', '200'], ['দুশো', '200'],
  ['দেড়শো', '150'], ['দেড়শ', '150'], ['দেড়শো', '150'],
  ['একশো', '100'], ['একশ', '100'], ['শো', '100'],
  ['নব্বই', '90'], ['আশি', '80'], ['সত্তর', '70'], ['ষাট', '60'],
  ['পঞ্চাশ', '50'], ['চল্লিশ', '40'], ['ত্রিশ', '30'], ['তিরিশ', '30'],
  ['পঁচিশ', '25'], ['বিশ', '20'], ['কুড়ি', '20'], ['কুড়ি', '20'],
  ['পনেরো', '15'], ['পনের', '15'], ['দশ', '10'],
  ['নয়', '9'], ['নয়', '9'], ['আট', '8'], ['সাত', '7'],
  ['ছয়', '6'], ['ছয়', '6'], ['পাঁচ', '5'], ['চার', '4'],
  ['তিন', '3'], ['দুই', '2'], ['এক', '1'],
];

const BANGLISH_NUMBER_WORDS: Array<[string, string]> = [
  ['dosh hajar', '10000'], ['dos hajar', '10000'],
  ['pach hajar', '5000'], ['panch hajar', '5000'],
  ['dui hajar', '2000'], ['ek hajar', '1000'],
  ['noysho', '900'], ['atsho', '800'], ['satsho', '700'], ['choysho', '600'],
  ['pachsho', '500'], ['pasho', '500'], ['panchsho', '500'],
  ['charsho', '400'], ['tinsho', '300'], ['duisho', '200'], ['dusho', '200'],
  ['dersho', '150'], ['eksho', '100'],
  ['nobboi', '90'], ['ashi', '80'], ['shottor', '70'], ['shat', '60'],
  ['ponchash', '50'], ['chollish', '40'], ['trish', '30'], ['tirish', '30'],
  ['pochish', '25'], ['bish', '20'], ['kuri', '20'], ['ponero', '15'], ['dosh', '10'], ['dos', '10'],
];

const ENGLISH_COMPOUND_NUMBERS: Array<[string, string]> = [
  ['ten thousand', '10000'],
  ['five thousand', '5000'],
  ['two thousand', '2000'],
  ['one thousand', '1000'],
  ['nine hundred', '900'],
  ['eight hundred', '800'],
  ['seven hundred', '700'],
  ['six hundred', '600'],
  ['five hundred', '500'],
  ['four hundred', '400'],
  ['three hundred', '300'],
  ['two hundred', '200'],
  ['one hundred fifty', '150'],
  ['one hundred', '100'],
];

const ENGLISH_NUMBER_WORDS: Record<string, string> = {
  thousand: '1000', hundred: '100',
  ninety: '90', eighty: '80', seventy: '70', sixty: '60', fifty: '50',
  forty: '40', thirty: '30', twenty: '20', nineteen: '19', eighteen: '18',
  seventeen: '17', sixteen: '16', fifteen: '15', fourteen: '14', thirteen: '13',
  twelve: '12', eleven: '11', ten: '10', nine: '9', eight: '8', seven: '7',
  six: '6', five: '5', four: '4', three: '3', two: '2', one: '1',
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeVoiceDigits(input: string): string {
  let text = normalizeBanglaDigits(input);
  for (const [word, num] of BANGLA_NUMBER_WORDS) {
    if (text.includes(word)) text = text.split(word).join(` ${num} `);
  }
  for (const [phrase, num] of BANGLISH_NUMBER_WORDS) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'), num);
  }
  for (const [phrase, num] of ENGLISH_COMPOUND_NUMBERS) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'), num);
  }
  for (const [word, num] of Object.entries(ENGLISH_NUMBER_WORDS)) {
    text = text.replace(new RegExp(`\\b${word}\\b`, 'gi'), num);
  }
  return text.replace(/\s+/g, ' ').trim();
}

export function parseVoiceTransaction(
  spokenText: string,
  accounts: AccountEntity[],
  categories: CategoryEntity[]
): ParsedVoiceTransaction {
  const trimmed = spokenText.trim();
  if (!trimmed) {
    return {
      rawText: spokenText,
      amount: 0,
      type: 'EXPENSE',
      categoryName: '',
      subcategoryName: '',
      matchedAccountId: null,
      matchedToAccountId: null,
      description: '',
      hasConfidentAmount: false,
      hasConfidentCategory: false,
      hasConfidentAccount: false,
      hasConfidentDescription: false,
    };
  }

  const normalized = normalizeVoiceDigits(trimmed);
  const lower = normalized.toLowerCase();

  const amtMatch = normalized.match(/(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g);
  const amount = amtMatch
    ? amtMatch.map((m) => parseFloat(m.replace(/,/g, ''))).find((n) => n > 0) ?? 0
    : 0;
  const hasConfidentAmount = amount > 0;

  const accountMentionCount = accounts.filter((a) => lower.includes(a.name.toLowerCase())).length;
  const isTransfer =
    lower.includes('transfer') ||
    lower.includes('ট্রান্সফার') ||
    (lower.includes('থেকে') && (lower.includes('তে') || lower.includes('এ')) && accountMentionCount >= 2) ||
    (lower.includes('from') && lower.includes('to') && accountMentionCount >= 2);

  const incomeKeywords = [
    'income', 'salary', 'earned', 'received', 'bonus', 'freelance', 'dividend', 'refund', 'gift received',
    'আয়', 'আয়', 'বেতন', 'পেয়েছি', 'পেয়েছি', 'বোনাস', 'ইনকাম', 'উপার্জন', 'কমিশন', 'ফ্রিল্যান্স',
    'beton', 'peyechi', 'peyesi', 'pelam', 'kamai', 'lav', 'munafa',
  ];
  const isIncome = !isTransfer && incomeKeywords.some((kw) => lower.includes(kw));
  const type: TransactionType = isTransfer ? 'TRANSFER' : isIncome ? 'INCOME' : 'EXPENSE';

  const accountAliases: Record<string, string[]> = {
    bkash: ['bkash', 'বিকাশ', 'বিকাশে', 'বিকাশের', 'bikash'],
    nagad: ['nagad', 'নগদ', 'নগদে', 'nogod'],
    rocket: ['rocket', 'রকেট', 'রকেটে', 'roket'],
    upay: ['upay', 'উপায়', 'উপায়'],
    cash: ['cash', 'ক্যাশ', 'নগদ টাকা', 'হাতে', 'pocket', 'wallet', 'নগদ ক্যাশ', 'nagad taka'],
    city: ['city bank', 'city', 'সিটি ব্যাংক', 'সিটি'],
    brac: ['brac bank', 'brac', 'ব্র্যাক ব্যাংক', 'ব্র্যাক'],
    dbbl: ['dutch bangla', 'dbbl', 'ডাচ বাংলা'],
    islami: ['islami bank', 'ইসলামী ব্যাংক'],
    eb: ['eastern bank', 'ebl', 'ইস্টার্ন ব্যাংক'],
    bank: ['bank', 'ব্যাংক', 'ব্যাংকে'],
    card: ['card', 'credit card', 'debit card', 'কার্ড', 'ক্রেডিট কার্ড'],
  };

  const matchedAccounts: AccountEntity[] = [];
  for (const acc of accounts) {
    const accLower = acc.name.toLowerCase();
    if (lower.includes(accLower)) {
      matchedAccounts.push(acc);
    } else {
      for (const [key, aliases] of Object.entries(accountAliases)) {
        if (accLower.includes(key) && aliases.some((a) => lower.includes(a))) {
          matchedAccounts.push(acc);
          break;
        }
      }
    }
  }

  const hasConfidentAccount = matchedAccounts.length > 0;
  const matchedAccountId = matchedAccounts[0]?.id ?? null;
  const matchedToAccountId = isTransfer && matchedAccounts.length >= 2 ? matchedAccounts[1].id : null;

  const keywordToCategory: Array<{ keywords: string[]; cat: string; sub: string }> = [
    {
      keywords: [
        'lunch', 'dinner', 'breakfast', 'food', 'meal', 'restaurant', 'burger', 'pizza', 'biriyani',
        'biryani', 'kacchi', 'tehari', 'khichuri', 'coffee', 'tea', 'cha', 'snacks', 'snack', 'bakery',
        'cafe', 'fast food', 'dining', 'iftaar', 'sehri', 'nasta', 'khabar', 'hotel',
        'খাবার', 'লাঞ্চ', 'ডিনার', 'নাস্তা', 'রেস্টুরেন্ট', 'বিরিয়ানি', 'বিরিয়ানি', 'চা', 'কফি', 'হোটেল', 'ইফতার',
      ],
      cat: 'Food & Dining',
      sub: 'Restaurant',
    },
    {
      keywords: [
        'grocery', 'groceries', 'supermarket', 'vegetables', 'fish', 'meat', 'milk', 'eggs', 'fruits', 'rice',
        'bazar', 'bazaar', 'kacha bazar', 'mudir', 'shobji', 'sobji', 'mach', 'mangsho', 'chal', 'dal', 'dim', 'dudh',
        'বাজার', 'মুদি', 'সবজি', 'মাছ', 'মাংস', 'চাল', 'ডাল', 'তেল', 'দুধ', 'ডিম', 'ফল', 'কাঁচাবাজার',
      ],
      cat: 'Groceries',
      sub: 'Produce & Vegetables',
    },
    {
      keywords: [
        'uber', 'pathao', 'rickshaw', 'riksha', 'bus', 'cng', 'auto', 'taxi', 'train', 'metro', 'fuel', 'octane',
        'petrol', 'fare', 'transport', 'ride', 'commute', 'parking', 'toll', 'bhara', 'vara',
        'ভাড়া', 'ভাড়া', 'রিকশা', 'বাস', 'সিএনজি', 'উবার', 'পাঠাও', 'ট্রেন', 'মেট্রো', 'তেল', 'অকটেন', 'যাতায়াত', 'যাতায়াত',
      ],
      cat: 'Transportation',
      sub: 'Ride Sharing',
    },
    {
      keywords: [
        'electricity', 'electric', 'water', 'gas', 'internet', 'wifi', 'broadband', 'mobile bill', 'recharge',
        'flexiload', 'utility', 'utilities', 'bill', 'bidyut', 'current bill', 'pani',
        'বিল', 'বিদ্যুৎ', 'কারেন্ট', 'গ্যাস', 'পানি', 'ইন্টারনেট', 'ওয়াইফাই', 'ওয়াইফাই', 'রিচার্জ', 'মোবাইল বিল',
      ],
      cat: 'Rent & Utilities',
      sub: 'Electricity',
    },
    {
      keywords: [
        'shopping', 'clothes', 'shirt', 'pant', 'shoes', 'dress', 'saree', 'panjabi', 'electronics', 'gadget',
        'accessories', 'cosmetics', 'jama', 'kapoor', 'kapor', 'juta',
        'শপিং', 'কেনাকাটা', 'জামা', 'কাপড়', 'কাপড়', 'জুতা', 'পোশাক', 'শাড়ি', 'পাঞ্জাবি',
      ],
      cat: 'Shopping',
      sub: 'Clothing',
    },
    {
      keywords: [
        'medicine', 'doctor', 'hospital', 'pharmacy', 'medical', 'clinic', 'health', 'test', 'vitamin',
        'oshudh', 'osudh', 'daktar', 'ওষুধ', 'ঔষধ', 'ডাক্তার', 'হাসপাতাল', 'ফার্মেসি', 'চিকিৎসা', 'টেস্ট',
      ],
      cat: 'Health & Medical',
      sub: 'Medicines',
    },
    {
      keywords: [
        'movie', 'netflix', 'spotify', 'game', 'concert', 'cinema', 'ticket', 'subscription', 'outing',
        'মুভি', 'সিনেমা', 'নেটফ্লিক্স', 'গেম', 'টিকিট', 'বিনোদন',
      ],
      cat: 'Entertainment',
      sub: 'Streaming Services',
    },
    {
      keywords: [
        'rent', 'house rent', 'apartment', 'maintenance', 'service charge', 'basha bhara', 'basa vara', 'mess bhara',
        'বাসা ভাড়া', 'বাসা ভাড়া', 'বাড়ি ভাড়া', 'বাড়ি ভাড়া', 'সার্ভিস চার্জ',
      ],
      cat: 'Rent & Utilities',
      sub: 'House Rent',
    },
    {
      keywords: ['salary', 'wage', 'paycheck', 'beton', 'বেতন', 'মাসিক বেতন'],
      cat: 'Salary',
      sub: 'Monthly Salary',
    },
    {
      keywords: ['freelance', 'project', 'client', 'upwork', 'fiverr', 'ফ্রিল্যান্স', 'প্রজেক্ট'],
      cat: 'Business',
      sub: 'Client Projects',
    },
  ];

  let matchedCat = '';
  let matchedSub = '';
  let hasConfidentCategory = false;

  for (const rule of keywordToCategory) {
    const hit = rule.keywords.some((kw) =>
      /^[ -~]+$/.test(kw)
        ? new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(lower)
        : lower.includes(kw)
    );
    if (hit) {
      const userCat = categories.find(
        (c) =>
          c.name.toLowerCase() === rule.cat.toLowerCase() ||
          c.name.toLowerCase().includes(rule.cat.split(' ')[0].toLowerCase())
      );
      matchedCat = userCat?.name ?? rule.cat;
      matchedSub = rule.sub;
      hasConfidentCategory = true;
      break;
    }
  }

  if (!hasConfidentCategory) {
    for (const cat of categories) {
      if (
        (cat.name && lower.includes(cat.name.toLowerCase())) ||
        (cat.nameBn && lower.includes(cat.nameBn))
      ) {
        matchedCat = cat.name;
        matchedSub = '';
        hasConfidentCategory = true;
        break;
      }
    }
  }

  let cleanedDesc = normalized
    .replace(/(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g, ' ')
    .replace(/(টাকা|taka|tk|bd|bdt|৳|\$)/gi, ' ')
    .replace(/(থেকে|দিয়ে|দিয়ে|তে|এ|জন্য|বাবদ|করেছি|করলাম|খরচ|হয়েছে|হয়েছে|দিলাম|পেলাম|পেয়েছি|পেয়েছি)/g, ' ')
    .replace(
      /\b(from|to|with|using|for|in|by|via|at|on|spent|paid|bought|got|received|korsi|korlam|khoroch|dilam|diyesi|pelam|peyesi|peyechi)\b/gi,
      ' '
    );

  for (const acc of matchedAccounts) {
    cleanedDesc = cleanedDesc.replace(new RegExp(escapeRegExp(acc.name), 'gi'), ' ');
    for (const [key, aliases] of Object.entries(accountAliases)) {
      if (acc.name.toLowerCase().includes(key)) {
        for (const alias of aliases) {
          cleanedDesc = cleanedDesc.replace(new RegExp(escapeRegExp(alias), 'gi'), ' ');
        }
      }
    }
  }

  cleanedDesc = cleanedDesc
    .replace(/[^\p{L}\p{M}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const hasConfidentDescription = cleanedDesc.length >= 2;
  const description = hasConfidentDescription
    ? cleanedDesc.charAt(0).toUpperCase() + cleanedDesc.slice(1)
    : hasConfidentCategory
    ? matchedCat
    : '';

  return {
    rawText: spokenText,
    amount,
    type,
    categoryName: matchedCat,
    subcategoryName: matchedSub,
    matchedAccountId,
    matchedToAccountId,
    description,
    hasConfidentAmount,
    hasConfidentCategory,
    hasConfidentAccount,
    hasConfidentDescription: hasConfidentDescription || hasConfidentCategory,
  };
}

export interface ReceiptAmountCandidate {
  amount: number;
  label: string;
  confidenceScore: number;
  isPrimaryTotal: boolean;
}

export interface ParsedReceiptData {
  rawText: string;
  totalAmount: number | null;
  merchantName: string | null;
  dateMillis: number | null;
  detectedCurrency: string | null;
  suggestedCategory: string | null;
  suggestedSubcategory: string | null;
  suggestedAccountId: string | null;
  hasText: boolean;
  candidateAmounts: ReceiptAmountCandidate[];
  isAmountAmbiguous: boolean;
  matchedTotalLabel: string | null;
}

const TIER1_PHRASES = [
  'grand total', 'net total', 'total payable', 'net payable', 'payable amount',
  'amount payable', 'amount due', 'balance due', 'total due', 'final total',
  'net bill', 'total bill', 'bill payable', 'total to pay', 'you pay',
  'সর্বমোট', 'মোট প্রদেয়', 'মোট প্রদেয়', 'নেট বিল', 'নেট মোট', 'পরিশোধযোগ্য',
];

const TIER2_PHRASES = [
  'total amount', 'net amount', 'bill amount', 'invoice total', 'sale total',
  'total tk', 'total bdt', 'total (bdt)', 'total (tk)',
  'মোট টাকা', 'মোট বিল', 'মোট মূল্য', 'মোট', 'total',
];

const SUBTOTAL_PHRASES = [
  'sub total', 'subtotal', 'sub-total', 'item total', 'items total',
  'gross total', 'gross amount', 'food total', 'উপমোট', 'সাবটোটাল', 'সাব-টোটাল',
];

const TAX_PHRASES = [
  'vat', 'tax', 'gst', 'cgst', 'sgst', 'igst', 'service charge', 'delivery charge',
  'delivery fee', 'packaging', 'rounding', 'ভ্যাট', 'ট্যাক্স', 'কর', 'সার্ভিস চার্জ',
];

const DISCOUNT_PHRASES = [
  'discount', 'disc', 'less', 'saving', 'savings', 'you saved', 'promo', 'coupon', 'cashback',
  'ডিসকাউন্ট', 'ছাড়', 'ছাড়',
];

const TENDERED_PHRASES = [
  'cash tendered', 'tendered', 'amount tendered', 'cash received', 'paid amount',
  'amount paid', 'cash paid', 'customer paid', 'total paid', 'payment received',
  'জমা', 'প্রদত্ত', 'পরিশোধিত',
];

const CHANGE_PHRASES = ['change', 'change due', 'return amount', 'refund', 'ফেরত', 'ভাংতি'];

function detectCurrencySymbol(text: string): string | null {
  const lower = text.toLowerCase();
  if (text.includes('৳') || lower.includes('bdt') || lower.includes('taka') || /\btk\.?\b/i.test(text) || text.includes('টাকা')) return '৳';
  if (text.includes('$') || lower.includes('usd')) return '$';
  if (text.includes('€') || lower.includes('eur')) return '€';
  if (text.includes('£') || lower.includes('gbp')) return '£';
  if (text.includes('₹') || lower.includes('inr')) return '₹';
  return null;
}

function classifyReceiptLine(lower: string): { tier: number; score: number; label: string } | null {
  if (SUBTOTAL_PHRASES.some((p) => lower.includes(p))) return { tier: 3, score: 55, label: 'Subtotal' };
  if (DISCOUNT_PHRASES.some((p) => lower.includes(p))) return { tier: 99, score: 0, label: 'Discount' };
  if (TAX_PHRASES.some((p) => lower.includes(p))) {
    const inclusive = (lower.includes('incl') || lower.includes('inc.')) && (lower.includes('total') || lower.includes('payable'));
    if (!inclusive) return { tier: 99, score: 0, label: 'Tax / Charge' };
  }
  if (CHANGE_PHRASES.some((p) => lower.includes(p))) return { tier: 99, score: 0, label: 'Change' };
  if (TENDERED_PHRASES.some((p) => lower.includes(p))) return { tier: 99, score: 0, label: 'Paid / Tendered' };
  for (const p of TIER1_PHRASES) {
    if (lower.includes(p)) {
      const title = p.replace(/\b\w/g, (c) => c.toUpperCase());
      return { tier: 1, score: 100, label: title };
    }
  }
  for (const p of TIER2_PHRASES) {
    if (lower.includes(p)) return { tier: 2, score: 85, label: 'Total' };
  }
  return null;
}

function extractAmountFromLine(line: string, requireDecimalOrCurrency = false): number | null {
  const hasCurrency = detectCurrencySymbol(line) !== null;
  const cleaned = line
    .replace(/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/g, ' ')
    .replace(/\b\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]m)?\b/gi, ' ')
    .replace(/\b\d+(?:\.\d+)?\s*%/g, ' ')
    .replace(/\b\d+\s*[x*]\s*/gi, ' ');

  const matches = cleaned.match(/(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/g);
  if (!matches) return null;
  for (let i = matches.length - 1; i >= 0; i--) {
    const raw = matches[i];
    const hasDecimal = raw.includes('.');
    const hasComma = raw.includes(',');
    const digits = raw.replace(/[,.]/g, '');
    if (!hasDecimal && !hasComma && digits.length >= 7) continue;
    const val = parseFloat(raw.replace(/,/g, ''));
    if (!hasDecimal && !hasCurrency && val >= 1990 && val <= 2035 && matches.length > 1) continue;
    if (requireDecimalOrCurrency && !hasDecimal && !hasCurrency && !hasComma) continue;
    if (val > 0 && val < 10_000_000) return val;
  }
  return null;
}

export function parseReceiptText(
  rawText: string,
  accounts: AccountEntity[],
  categories: CategoryEntity[]
): ParsedReceiptData {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      rawText,
      totalAmount: null,
      merchantName: null,
      dateMillis: null,
      detectedCurrency: null,
      suggestedCategory: null,
      suggestedSubcategory: null,
      suggestedAccountId: null,
      hasText: false,
      candidateAmounts: [],
      isAmountAmbiguous: false,
      matchedTotalLabel: null,
    };
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const detectedCurrency = detectCurrencySymbol(trimmed);

  const skipMerchant = [
    'receipt', 'invoice', 'tax invoice', 'cash memo', 'bill', 'welcome', 'thank you',
    'date', 'time', 'tel', 'phone', 'mobile', 'vat', 'bin', 'tin', 'মোট', 'রসিদ', 'ধন্যবাদ',
  ];
  let merchantName: string | null = null;
  for (const line of lines.slice(0, 6)) {
    const lower = line.toLowerCase();
    const digits = (line.match(/[0-9০-৯]/g) || []).length;
    const letters = (line.match(/\p{L}/gu) || []).length;
    if (
      letters >= 3 &&
      digits <= letters &&
      line.length >= 3 &&
      line.length <= 55 &&
      !skipMerchant.some((p) => lower.startsWith(p) || lower === p)
    ) {
      merchantName = line;
      break;
    }
  }

  const normalizedLines = lines.map((l) => normalizeBanglaDigits(l));
  const scored: Array<{ lineIndex: number; amount: number; label: string; tier: number; score: number }> = [];

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];
    const lower = line.toLowerCase();
    if (/(?:\+?88)?01[3-9]\d{2}[-\s]?\d{6}/.test(lower)) continue;
    const cls = classifyReceiptLine(lower);
    const amount = extractAmountFromLine(line);
    if (amount && cls && cls.tier <= 3) {
      const posBonus = i >= normalizedLines.length / 2 ? 5 : 0;
      scored.push({
        lineIndex: i,
        amount,
        label: cls.label,
        tier: cls.tier,
        score: cls.score + posBonus,
      });
    }
  }

  const sortedForUi = [...scored].sort((a, b) => a.tier - b.tier || b.lineIndex - a.lineIndex);
  const seenAmt = new Set<string>();
  const uiCandidates: ReceiptAmountCandidate[] = [];
  for (const c of sortedForUi) {
    const key = c.amount.toFixed(2);
    if (seenAmt.has(key)) continue;
    seenAmt.add(key);
    uiCandidates.push({
      amount: c.amount,
      label: c.label,
      confidenceScore: c.score,
      isPrimaryTotal: uiCandidates.length === 0 && c.tier <= 2,
    });
  }

  const tier1 = scored.filter((c) => c.tier === 1);
  const tier2 = scored.filter((c) => c.tier === 2);
  const tier3 = scored.filter((c) => c.tier === 3);

  let selectedTotal: number | null = null;
  let matchedTotalLabel: string | null = null;
  let isAmountAmbiguous = false;

  if (tier1.length > 0) {
    const chosen = tier1.sort((a, b) => b.score - a.score || b.lineIndex - a.lineIndex)[0];
    selectedTotal = chosen.amount;
    matchedTotalLabel = chosen.label;
    isAmountAmbiguous = new Set(tier1.map((c) => c.amount)).size > 1;
  } else if (tier2.length > 0) {
    const chosen = tier2.sort((a, b) => b.score - a.score || b.lineIndex - a.lineIndex)[0];
    selectedTotal = chosen.amount;
    matchedTotalLabel = chosen.label;
    isAmountAmbiguous = new Set(tier2.map((c) => c.amount)).size > 1;
  } else if (tier3.length > 0) {
    const chosen = tier3[tier3.length - 1];
    selectedTotal = chosen.amount;
    matchedTotalLabel = chosen.label;
    isAmountAmbiguous = true;
  } else {
    for (let i = normalizedLines.length - 1; i >= 0; i--) {
      const line = normalizedLines[i];
      if (classifyReceiptLine(line.toLowerCase())?.tier === 99) continue;
      const amt = extractAmountFromLine(line, true);
      if (amt && !uiCandidates.some((c) => c.amount === amt)) {
        uiCandidates.push({
          amount: amt,
          label: line.slice(0, 28),
          confidenceScore: 35,
          isPrimaryTotal: false,
        });
        if (uiCandidates.length >= 4) break;
      }
    }
    isAmountAmbiguous = uiCandidates.length > 0;
  }

  // Date extraction
  let dateMillis: number | null = null;
  for (const line of normalizedLines) {
    const m1 = line.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (m1) {
      const d = new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        dateMillis = d.getTime();
        break;
      }
    }
    const m2 = line.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
    if (m2) {
      let y = Number(m2[3]);
      if (y < 100) y += 2000;
      const d = new Date(y, Number(m2[2]) - 1, Number(m2[1]));
      if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2100) {
        dateMillis = d.getTime();
        break;
      }
    }
  }

  // Category inference
  const combined = `${merchantName ?? ''} ${trimmed}`.toLowerCase();
  const catRules: Array<[string[], string, string]> = [
    [['restaurant', 'cafe', 'coffee', 'burger', 'pizza', 'biriyani', 'kacchi', 'kitchen', 'food', 'রেস্টুরেন্ট', 'হোটেল', 'ক্যাফে'], 'Food & Dining', 'Restaurant'],
    [['shwapno', 'agora', 'meena bazar', 'unimart', 'supermarket', 'grocery', 'mart', 'bazar', 'স্বপ্ন', 'আগোরা', 'মুদি'], 'Groceries', 'Pantry Staples'],
    [['pharma', 'pharmacy', 'medicine', 'hospital', 'clinic', 'lazz pharma', 'ফার্মেসি', 'ওষুধ'], 'Health & Medical', 'Medicines'],
    [['fuel', 'petrol', 'octane', 'uber', 'pathao', 'পেট্রোল', 'অকটেন'], 'Transportation', 'Fuel'],
    [['aarong', 'yellow', 'apex', 'bata', 'fashion', 'clothing', 'আরং', 'বাটা'], 'Shopping', 'Clothing'],
    [['desco', 'dpdc', 'wasa', 'titas', 'electricity', 'internet', 'broadband', 'বিদ্যুৎ'], 'Rent & Utilities', 'Electricity'],
  ];

  let suggestedCategory: string | null = null;
  let suggestedSubcategory: string | null = null;
  for (const [kws, cat, sub] of catRules) {
    if (kws.some((k) => combined.includes(k))) {
      const found = categories.find(
        (c) => c.name.toLowerCase() === cat.toLowerCase() || c.name.toLowerCase().includes(cat.split(' ')[0].toLowerCase())
      );
      suggestedCategory = found?.name ?? cat;
      suggestedSubcategory = sub;
      break;
    }
  }

  // Account inference
  let suggestedAccountId: string | null = null;
  const lowerAll = trimmed.toLowerCase();
  const accAliases: Record<string, string[]> = {
    bkash: ['bkash', 'বিকাশ'],
    nagad: ['nagad', 'নগদ'],
    rocket: ['rocket', 'রকেট'],
    city: ['city bank', 'amex', 'সিটি ব্যাংক'],
    brac: ['brac bank', 'ব্র্যাক ব্যাংক'],
    dbbl: ['dbbl', 'nexus', 'ডাচ বাংলা'],
  };
  for (const acc of accounts) {
    const al = acc.name.toLowerCase();
    if (lowerAll.includes(al)) {
      suggestedAccountId = acc.id;
      break;
    }
    for (const [k, kws] of Object.entries(accAliases)) {
      if (al.includes(k) && kws.some((kw) => lowerAll.includes(kw))) {
        suggestedAccountId = acc.id;
        break;
      }
    }
    if (suggestedAccountId) break;
  }

  return {
    rawText,
    totalAmount: selectedTotal,
    merchantName,
    dateMillis,
    detectedCurrency,
    suggestedCategory,
    suggestedSubcategory,
    suggestedAccountId,
    hasText: true,
    candidateAmounts: uiCandidates,
    isAmountAmbiguous,
    matchedTotalLabel,
  };
}
