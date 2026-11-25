import type { CategoryEntity, SubcategoryEntity } from '../types/models';

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
        ['Fuel', 'জ্বালানী'],
        ['Public Transit', 'বাস ও ট্রেন'],
        ['Ride Sharing', 'রাইড শেয়ারিং'],
        ['Tolls & Parking', 'টোল ও পার্কিং'],
      ],
    },
    {
      id: 'cat_rent',
      name: 'Rent & Utilities',
      nameBn: 'ভাড়া ও ইউটিলিটি',
      icon: 'home',
      color: '#3B82F6',
      subs: [
        ['House Rent', 'বাড়ি ভাড়া'],
        ['Electricity', 'বিদ্যুৎ'],
        ['Gas', 'গ্যাস'],
        ['Water', 'পানি'],
        ['Internet', 'ইন্টারনেট'],
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
      id: 'cat_groceries',
      name: 'Groceries',
      nameBn: 'মুদি বাজার',
      icon: 'shopping_cart',
      color: '#10B981',
      subs: [
        ['Produce & Vegetables', 'শাকসবজি ও ফল'],
        ['Fish & Meat', 'মাছ ও মাংস'],
        ['Dairy & Eggs', 'দুধ ও ডিম'],
        ['Pantry Staples', 'নিত্য প্রয়োজনীয় চাল-ডাল'],
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
        ['Travel Shopping', 'ভ্রমণ কেনাকাটা'],
      ],
    },
    {
      id: 'cat_family',
      name: 'Family',
      nameBn: 'পরিবার',
      icon: 'family_restroom',
      color: '#F97316',
      subs: [
        ['Parents Support', 'বাবা-মার খরচ'],
        ['Children & Childcare', 'সন্তানের খরচ'],
        ['Family Occasions', 'পারিবারিক অনুষ্ঠান'],
        ['Family Support', 'পারিবারিক সহায়তা'],
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
        ['Monthly Salary', 'মাসিক বেতন'],
        ['Overtime', 'ওভারটাইম'],
        ['Allowances', 'ভাতা'],
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
      id: 'cat_business',
      name: 'Business',
      nameBn: 'ব্যবসা',
      icon: 'trending_up',
      color: '#2563EB',
      subs: [
        ['Sales & Revenue', 'বিক্রয় আয়'],
        ['Client Projects', 'ক্লায়েন্ট প্রজেক্ট'],
        ['Consulting', 'পরামর্শ সেবা'],
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
        ['Mobile Financial Service', 'মোবাইল ফিন্যান্সিয়াল সার্ভিস (MFS)'],
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
        ['Cheque Deposit', 'চেক জমা'],
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
  'cat_food_dining', 'cat_shopping', 'cat_transport', 'cat_rent', 'cat_health_medical',
  'cat_entertainment', 'cat_personal_care', 'cat_groceries', 'cat_travel', 'cat_family',
  'cat_debt_repayment', 'cat_other_expenses', 'cat_salary', 'cat_bonus', 'cat_business',
  'cat_gifts_received', 'cat_other_income', 'cat_wallet_transfer', 'cat_bank_transfer',
  'cat_other_transfer',
]);
