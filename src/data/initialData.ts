import type {
  AccountEntity,
  AccountType,
  AppLanguage,
  CategoryEntity,
  SpendingWayItem,
  SubcategoryEntity,
} from '../types/models';

export interface QuickSubcategoryPreset {
  name: string;
  nameBn: string;
  defaultExpenseCategory: string;
  defaultIncomeCategory: string;
}

export interface CardCompanyPreset {
  id: string;
  name: string;
  nameBn: string;
  institution: string;
  type: AccountType;
  colorHex: string;
}

export const BANK_MFS_PRESETS: CardCompanyPreset[] = [
  {
    id: 'bkash',
    name: 'bKash',
    nameBn: 'বিকাশ',
    institution: 'bKash',
    type: 'MFS',
    colorHex: '#E2136E',
  },
  {
    id: 'nagad',
    name: 'Nagad',
    nameBn: 'নগদ',
    institution: 'Nagad',
    type: 'MFS',
    colorHex: '#F26522',
  },
  {
    id: 'rocket',
    name: 'Rocket',
    nameBn: 'রকেট',
    institution: 'Rocket (DBBL)',
    type: 'MFS',
    colorHex: '#8C3494',
  },
  {
    id: 'upay',
    name: 'Upay',
    nameBn: 'উপায়',
    institution: 'Upay',
    type: 'MFS',
    colorHex: '#0066B3',
  },
  {
    id: 'islami_bank',
    name: 'Islami Bank',
    nameBn: 'ইসলামী ব্যাংক',
    institution: 'Islami Bank PLC',
    type: 'BANK',
    colorHex: '#047857',
  },
  {
    id: 'dbbl',
    name: 'Dutch-Bangla Bank',
    nameBn: 'ডাচ-বাংলা ব্যাংক',
    institution: 'Dutch-Bangla Bank',
    type: 'BANK',
    colorHex: '#1D4ED8',
  },
  {
    id: 'brac_bank',
    name: 'BRAC Bank',
    nameBn: 'ব্র্যাক ব্যাংক',
    institution: 'BRAC Bank PLC',
    type: 'BANK',
    colorHex: '#0369A1',
  },
  {
    id: 'city_bank',
    name: 'City Bank',
    nameBn: 'সিটি ব্যাংক',
    institution: 'City Bank PLC',
    type: 'BANK',
    colorHex: '#1E3A8A',
  },
  {
    id: 'sonali_bank',
    name: 'Sonali Bank',
    nameBn: 'সোনালী ব্যাংক',
    institution: 'Sonali Bank PLC',
    type: 'BANK',
    colorHex: '#B45309',
  },
  {
    id: 'ebl',
    name: 'Eastern Bank',
    nameBn: 'ইস্টার্ন ব্যাংক',
    institution: 'Eastern Bank PLC',
    type: 'BANK',
    colorHex: '#4338CA',
  },
  {
    id: 'pubali_bank',
    name: 'Pubali Bank',
    nameBn: 'পূবালী ব্যাংক',
    institution: 'Pubali Bank PLC',
    type: 'BANK',
    colorHex: '#0F766E',
  },
  {
    id: 'cash',
    name: 'My Cash',
    nameBn: 'আমার ক্যাশ',
    institution: 'Cash',
    type: 'CASH',
    colorHex: '#059669',
  },
];

export function getDefaultSpendingWays(language: AppLanguage = 'BANGLA'): SpendingWayItem[] {
  const isBn = language === 'BANGLA';
  return [
    { id: 'way_personal', name: isBn ? 'পার্সোনাল' : 'Personal' },
    { id: 'way_family', name: isBn ? 'ফ্যামিলি' : 'Family' },
    { id: 'way_business', name: isBn ? 'বিজনেস' : 'Business' },
    { id: 'way_home', name: isBn ? 'নিজের বাড়ি' : 'Own Home' },
    { id: 'way_groceries', name: isBn ? 'বাজার ও খরচ' : 'Groceries' },
    { id: 'way_other', name: isBn ? 'অন্যান্য' : 'Other' },
  ];
}

export const QUICK_SUBCATEGORY_PRESETS: QuickSubcategoryPreset[] = [
  {
    name: 'Personal',
    nameBn: 'পার্সোনাল',
    defaultExpenseCategory: 'Personal',
    defaultIncomeCategory: 'Personal Income',
  },
  {
    name: 'Family',
    nameBn: 'ফ্যামিলি',
    defaultExpenseCategory: 'Family',
    defaultIncomeCategory: 'Family Support',
  },
  {
    name: 'Business',
    nameBn: 'বিজনেস',
    defaultExpenseCategory: 'Business Expense',
    defaultIncomeCategory: 'Business',
  },
  {
    name: 'Own Home',
    nameBn: 'নিজের বাড়ি',
    defaultExpenseCategory: 'Rent & Utilities',
    defaultIncomeCategory: 'Other Income',
  },
  {
    name: 'Groceries & Market',
    nameBn: 'বাজার ও মুদি',
    defaultExpenseCategory: 'Groceries',
    defaultIncomeCategory: 'Other Income',
  },
  {
    name: 'Bills & Rent',
    nameBn: 'বিল ও ভাড়া',
    defaultExpenseCategory: 'Rent & Utilities',
    defaultIncomeCategory: 'Other Income',
  },
  {
    name: 'Transport',
    nameBn: 'যাতায়াত',
    defaultExpenseCategory: 'Transportation',
    defaultIncomeCategory: 'Other Income',
  },
  {
    name: 'Salary & Bonus',
    nameBn: 'বেতন ও বোনাস',
    defaultExpenseCategory: 'Other Expenses',
    defaultIncomeCategory: 'Salary',
  },
];

export function getDefaultFourCoreAccounts(language: AppLanguage = 'BANGLA'): AccountEntity[] {
  const isBn = language === 'BANGLA';
  return [
    {
      id: 'acc_core_bkash',
      name: isBn ? 'বিকাশ' : 'bKash',
      type: 'MFS',
      institution: 'bKash',
      balance: 0,
      openingBalance: 0,
      accountNumberLast4: '',
      colorHex: '#E2136E',
      iconName: 'mfs',
      isHidden: false,
      sortOrder: 0,
      creditLimit: 0,
      billingDate: '',
      paymentDueDate: '',
      minPayment: 0,
      notes: 'Subtype:Mobile Wallet',
      includeInTotal: true,
    },
    {
      id: 'acc_core_nagad',
      name: isBn ? 'নগদ' : 'Nagad',
      type: 'MFS',
      institution: 'Nagad',
      balance: 0,
      openingBalance: 0,
      accountNumberLast4: '',
      colorHex: '#F26522',
      iconName: 'mfs',
      isHidden: false,
      sortOrder: 1,
      creditLimit: 0,
      billingDate: '',
      paymentDueDate: '',
      minPayment: 0,
      notes: 'Subtype:Mobile Wallet',
      includeInTotal: true,
    },
    {
      id: 'acc_core_cash',
      name: isBn ? 'আমার ক্যাশ' : 'My Cash',
      type: 'CASH',
      institution: 'Cash',
      balance: 0,
      openingBalance: 0,
      accountNumberLast4: '',
      colorHex: '#059669',
      iconName: 'cash',
      isHidden: false,
      sortOrder: 2,
      creditLimit: 0,
      billingDate: '',
      paymentDueDate: '',
      minPayment: 0,
      notes: 'Subtype:Cash in Hand',
      includeInTotal: true,
    },
    {
      id: 'acc_core_bank',
      name: isBn ? 'ইসলামী ব্যাংক' : 'Islami Bank',
      type: 'BANK',
      institution: 'Islami Bank PLC',
      balance: 0,
      openingBalance: 0,
      accountNumberLast4: '',
      colorHex: '#047857',
      iconName: 'bank',
      isHidden: false,
      sortOrder: 3,
      creditLimit: 0,
      billingDate: '',
      paymentDueDate: '',
      minPayment: 0,
      notes: 'Network:Visa | Subtype:Bank Account',
      includeInTotal: true,
    },
  ];
}

export function getDefaultCategories(): {
  categories: CategoryEntity[];
  subcategories: SubcategoryEntity[];
} {
  const expenseSpecs: Array<{
    id: string;
    name: string;
    nameBn: string;
    icon: string;
    color: string;
    subs: Array<[string, string]>;
  }> = [
    {
      id: 'cat_personal',
      name: 'Personal',
      nameBn: 'পার্সোনাল',
      icon: 'face',
      color: '#0EA5E9',
      subs: [
        ['Personal', 'পার্সোনাল'],
        ['Pocket Money', 'হাতখরচ'],
        ['Self Care', 'ব্যক্তিগত যত্ন'],
        ['Subscriptions', 'সাবস্ক্রিপশন'],
      ],
    },
    {
      id: 'cat_family',
      name: 'Family',
      nameBn: 'ফ্যামিলি / পরিবার',
      icon: 'family_restroom',
      color: '#F97316',
      subs: [
        ['Family', 'ফ্যামিলি'],
        ['Parents Support', 'বাবা-মার খরচ'],
        ['Children & Education', 'সন্তান ও পড়াশোনা'],
        ['Family Occasions', 'পারিবারিক অনুষ্ঠান'],
      ],
    },
    {
      id: 'cat_business_expense',
      name: 'Business Expense',
      nameBn: 'বিজনেস খরচ',
      icon: 'trending_up',
      color: '#2563EB',
      subs: [
        ['Business', 'বিজনেস'],
        ['Inventory & Stock', 'মালামাল ক্রয়'],
        ['Office & Operations', 'অফিস ও পরিচালনা'],
        ['Staff & Vendor', 'কর্মচারী ও ভেন্ডর'],
        ['Marketing & Ads', 'মার্কেটিং ও বিজ্ঞাপন'],
      ],
    },
    {
      id: 'cat_food_dining',
      name: 'Food & Dining',
      nameBn: 'খাবার ও ডাইনিং',
      icon: 'restaurant',
      color: '#F59E0B',
      subs: [
        ['Restaurant', 'রেস্তোরাঁ'],
        ['Fast Food', 'ফাস্ট ফুড'],
        ['Cafes & Coffee', 'কফি ও পানীয়'],
        ['Street Food', 'স্ট্রিট ফুড'],
      ],
    },
    {
      id: 'cat_groceries',
      name: 'Groceries',
      nameBn: 'মুদি বাজার',
      icon: 'shopping_cart',
      color: '#10B981',
      subs: [
        ['Groceries & Market', 'বাজার ও মুদি'],
        ['Produce & Vegetables', 'শাকসবজি ও ফল'],
        ['Fish & Meat', 'মাছ ও মাংস'],
        ['Pantry Staples', 'চাল-ডাল ও নিত্যপণ্য'],
      ],
    },
    {
      id: 'cat_shopping',
      name: 'Shopping',
      nameBn: 'কেনাকাটা',
      icon: 'shopping_bag',
      color: '#EC4899',
      subs: [
        ['Clothing', 'পোশাক'],
        ['Electronics', 'ইলেকট্রনিক্স'],
        ['Home & Kitchen', 'গৃহস্থালী সামগ্রী'],
        ['Footwear', 'জুতা'],
      ],
    },
    {
      id: 'cat_transport',
      name: 'Transportation',
      nameBn: 'যাতায়াত',
      icon: 'directions_car',
      color: '#6366F1',
      subs: [
        ['Transport', 'যাতায়াত'],
        ['Fuel', 'জ্বালানী'],
        ['Public Transit', 'বাস ও ট্রেন'],
        ['Ride Sharing', 'রাইড শেয়ারিং'],
      ],
    },
    {
      id: 'cat_rent',
      name: 'Rent & Utilities',
      nameBn: 'ভাড়া ও ইউটিলিটি',
      icon: 'home',
      color: '#3B82F6',
      subs: [
        ['Bills & Rent', 'বিল ও ভাড়া'],
        ['House Rent', 'বাড়ি ভাড়া'],
        ['Electricity', 'বিদ্যুৎ'],
        ['Gas & Water', 'গ্যাস ও পানি'],
        ['Internet & Mobile', 'ইন্টারনেট ও মোবাইল'],
      ],
    },
    {
      id: 'cat_health_medical',
      name: 'Health & Medical',
      nameBn: 'স্বাস্থ্য ও চিকিৎসা',
      icon: 'medical_services',
      color: '#EF4444',
      subs: [
        ['Doctor & Visits', 'ডাক্তার'],
        ['Medicines', 'ওষুধ'],
        ['Diagnostic & Tests', 'টেস্ট ও পরীক্ষা'],
        ['Hospital', 'হাসপাতাল'],
      ],
    },
    {
      id: 'cat_entertainment',
      name: 'Entertainment',
      nameBn: 'বিনোদন',
      icon: 'movie',
      color: '#8B5CF6',
      subs: [
        ['Movies & Shows', 'চলচ্চিত্র ও নাটক'],
        ['Games & Gaming', 'গেমিং'],
        ['Streaming Services', 'স্ট্রিমিং সাবস্ক্রিপশন'],
        ['Concerts & Events', 'কনসার্ট ও ইভেন্ট'],
      ],
    },
    {
      id: 'cat_personal_care',
      name: 'Personal Care',
      nameBn: 'ব্যক্তিগত যত্ন',
      icon: 'face',
      color: '#14B8A6',
      subs: [
        ['Salon & Grooming', 'সেলুন ও রূপচর্চা'],
        ['Cosmetics & Toiletries', 'প্রসাধন সামগ্রী'],
        ['Spa & Wellness', 'স্পা ও স্বাস্থ্যচর্চা'],
      ],
    },
    {
      id: 'cat_travel',
      name: 'Travel',
      nameBn: 'ভ্রমণ',
      icon: 'flight',
      color: '#06B6D4',
      subs: [
        ['Flights & Long Distance', 'বিমান ও দূরপাল্লার টিকিট'],
        ['Hotel & Lodging', 'হোটেল ও থাকার ব্যবস্থা'],
        ['Sightseeing & Tours', 'দর্শনীয় স্থান'],
      ],
    },
    {
      id: 'cat_debt_repayment',
      name: 'Debt Repayment',
      nameBn: 'ঋণ পরিশোধ',
      icon: 'receipt_long',
      color: '#DC2626',
      subs: [
        ['Loan Principal', 'ঋণের আসল'],
        ['Installment (EMI)', 'কিস্তি (ইএমআই)'],
        ['Credit Card Payment', 'ক্রেডিট কার্ড বিল'],
      ],
    },
    {
      id: 'cat_other_expenses',
      name: 'Other Expenses',
      nameBn: 'অন্যান্য খরচ',
      icon: 'category',
      color: '#64748B',
      subs: [
        ['General Miscellaneous', 'সাধারণ বিবিধ'],
        ['Donations & Charity', 'দান ও সদকা'],
        ['Bank & Transfer Fees', 'ব্যাংক ও ট্রান্সফার ফি'],
      ],
    },
  ];

  const incomeSpecs: Array<{
    id: string;
    name: string;
    nameBn: string;
    icon: string;
    color: string;
    subs: Array<[string, string]>;
  }> = [
    {
      id: 'cat_salary',
      name: 'Salary',
      nameBn: 'বেতন',
      icon: 'payments',
      color: '#10B981',
      subs: [
        ['Salary & Bonus', 'বেতন ও বোনাস'],
        ['Monthly Salary', 'মাসিক বেতন'],
        ['Overtime & Allowances', 'ওভারটাইম ও ভাতা'],
      ],
    },
    {
      id: 'cat_business',
      name: 'Business',
      nameBn: 'বিজনেস আয়',
      icon: 'trending_up',
      color: '#2563EB',
      subs: [
        ['Business', 'বিজনেস'],
        ['Sales & Revenue', 'বিক্রয় আয়'],
        ['Client Projects', 'ক্লায়েন্ট প্রজেক্ট'],
        ['Consulting', 'পরামর্শ সেবা'],
      ],
    },
    {
      id: 'cat_personal_income',
      name: 'Personal Income',
      nameBn: 'পার্সোনাল আয়',
      icon: 'face',
      color: '#0EA5E9',
      subs: [
        ['Personal', 'পার্সোনাল'],
        ['Freelance & Side Income', 'ফ্রিল্যান্সিং ও সাইড আয়'],
        ['Commission', 'কমিশন'],
      ],
    },
    {
      id: 'cat_family_income',
      name: 'Family Support',
      nameBn: 'ফ্যামিলি থেকে প্রাপ্ত',
      icon: 'family_restroom',
      color: '#F97316',
      subs: [
        ['Family', 'ফ্যামিলি'],
        ['Family Remittance', 'পারিবারিক রেমিট্যান্স'],
        ['Parents / Relative', 'পরিবার থেকে প্রাপ্ত'],
      ],
    },
    {
      id: 'cat_bonus',
      name: 'Bonus',
      nameBn: 'বোনাস',
      icon: 'savings',
      color: '#059669',
      subs: [
        ['Festival Bonus', 'উৎসব বোনাস'],
        ['Performance Bonus', 'পারফরম্যান্স বোনাস'],
      ],
    },
    {
      id: 'cat_gifts_received',
      name: 'Gifts Received',
      nameBn: 'প্রাপ্ত উপহার',
      icon: 'card_giftcard',
      color: '#EC4899',
      subs: [
        ['Cash Gift', 'নগদ উপহার'],
        ['Occasion Gift', 'উপলক্ষ উপহার'],
      ],
    },
    {
      id: 'cat_other_income',
      name: 'Other Income',
      nameBn: 'অন্যান্য আয়',
      icon: 'account_balance_wallet',
      color: '#14B8A6',
      subs: [
        ['Interest & Profit', 'মুনাফা ও সুদ'],
        ['Rental Income', 'বাড়ি/জায়গা ভাড়া'],
        ['Refunds & Cashbacks', 'রিফান্ড ও ক্যাশব্যাক'],
        ['Miscellaneous', 'বিবিধ আয়'],
      ],
    },
  ];

  const transferSpecs: Array<{
    id: string;
    name: string;
    nameBn: string;
    icon: string;
    color: string;
    subs: Array<[string, string]>;
  }> = [
    {
      id: 'cat_wallet_transfer',
      name: 'Wallet Transfer',
      nameBn: 'ওয়ালেট ট্রান্সফার',
      icon: 'wallet',
      color: '#3B82F6',
      subs: [
        ['Personal', 'পার্সোনাল'],
        ['Family', 'ফ্যামিলি'],
        ['Business', 'বিজনেস'],
        ['Cash to Wallet', 'নগদ থেকে ওয়ালেট'],
        ['Wallet to Cash', 'ওয়ালেট থেকে নগদ'],
      ],
    },
    {
      id: 'cat_bank_transfer',
      name: 'Bank Transfer',
      nameBn: 'ব্যাংক ট্রান্সফার',
      icon: 'account_balance',
      color: '#6366F1',
      subs: [
        ['Account to Account', 'অ্যাকাউন্ট থেকে অ্যাকাউন্ট'],
        ['ATM Withdrawal', 'এটিএম উত্তোলন'],
        ['Bank Deposit', 'ব্যাংকে জমা'],
      ],
    },
    {
      id: 'cat_other_transfer',
      name: 'Other Transfer',
      nameBn: 'অন্যান্য ট্রান্সফার',
      icon: 'swap_horiz',
      color: '#0284C7',
      subs: [
        ['Internal Account Transfer', 'অভ্যন্তরীণ স্থানান্তর'],
        ['Adjustment Transfer', 'সমন্বয় স্থানান্তর'],
      ],
    },
  ];

  const categories: CategoryEntity[] = [];
  const subcategories: SubcategoryEntity[] = [];

  expenseSpecs.forEach((spec, idx) => {
    categories.push({
      id: spec.id,
      name: spec.name,
      nameBn: spec.nameBn,
      isIncome: false,
      isTransfer: false,
      isActive: true,
      iconName: spec.icon,
      colorHex: spec.color,
      sortOrder: idx,
    });
    spec.subs.forEach(([subName, subNameBn], subIdx) => {
      subcategories.push({
        id: `${spec.id}_sub_${subIdx}`,
        categoryId: spec.id,
        name: subName,
        nameBn: subNameBn,
        sortOrder: subIdx,
      });
    });
  });

  incomeSpecs.forEach((spec, idx) => {
    categories.push({
      id: spec.id,
      name: spec.name,
      nameBn: spec.nameBn,
      isIncome: true,
      isTransfer: false,
      isActive: true,
      iconName: spec.icon,
      colorHex: spec.color,
      sortOrder: 1000 + idx,
    });
    spec.subs.forEach(([subName, subNameBn], subIdx) => {
      subcategories.push({
        id: `${spec.id}_sub_${subIdx}`,
        categoryId: spec.id,
        name: subName,
        nameBn: subNameBn,
        sortOrder: subIdx,
      });
    });
  });

  transferSpecs.forEach((spec, idx) => {
    categories.push({
      id: spec.id,
      name: spec.name,
      nameBn: spec.nameBn,
      isIncome: false,
      isTransfer: true,
      isActive: true,
      iconName: spec.icon,
      colorHex: spec.color,
      sortOrder: 2000 + idx,
    });
    spec.subs.forEach(([subName, subNameBn], subIdx) => {
      subcategories.push({
        id: `${spec.id}_sub_${subIdx}`,
        categoryId: spec.id,
        name: subName,
        nameBn: subNameBn,
        sortOrder: subIdx,
      });
    });
  });

  return { categories, subcategories };
}

export const BUILT_IN_CATEGORY_IDS = new Set([
  'cat_personal', 'cat_family', 'cat_business_expense',
  'cat_food_dining', 'cat_shopping', 'cat_transport', 'cat_rent', 'cat_health_medical',
  'cat_entertainment', 'cat_personal_care', 'cat_groceries', 'cat_travel',
  'cat_debt_repayment', 'cat_other_expenses', 'cat_salary', 'cat_bonus', 'cat_business',
  'cat_personal_income', 'cat_family_income',
  'cat_gifts_received', 'cat_other_income', 'cat_wallet_transfer', 'cat_bank_transfer',
  'cat_other_transfer',
]);
