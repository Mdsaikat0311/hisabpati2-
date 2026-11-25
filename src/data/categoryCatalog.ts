import type { BackgroundTextureOption, ThemeColorOption } from '../types/models';

export const COLOR_PALETTE_30: string[] = [
  '#FF4D4D', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50',
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800',
  '#FF5722', '#795548', '#9E9E9E', '#607D8B', '#212121',
  '#E2136E', '#8B3392', '#F26522', '#0284C7', '#0D9488',
  '#16A34A', '#D97706', '#DC2626', '#4F46E5', '#059669',
];

export const PREVIEW_5_COLORS: string[] = ['#FF4D4D', '#2196F3', '#10B981', '#FF9800', '#9C27B0'];

export const ICON_CATALOG_80: string[] = [
  'restaurant', 'shopping_bag', 'directions_car', 'home', 'payments',
  'medical_services', 'movie', 'face', 'shopping_cart', 'flight',
  'family_restroom', 'receipt_long', 'category', 'savings', 'trending_up',
  'card_giftcard', 'account_balance_wallet', 'wallet', 'account_balance', 'swap_horiz',
  'groups', 'percent', 'pets', 'fitness_center', 'local_cafe',
  'wifi', 'phone_android', 'flatware', 'fastfood', 'local_gas_station',
  'local_parking', 'directions_bus', 'local_taxi', 'cottage', 'electric_bolt',
  'water_drop', 'checkroom', 'devices', 'weekend', 'palette',
  'child_care', 'local_laundry_service', 'healing', 'business_center', 'flight_takeoff',
  'hotel', 'beach_access', 'menu_book', 'receipt', 'sports_esports',
  'music_note', 'apps', 'stroller', 'star', 'update',
  'pie_chart', 'directions_walk', 'monetization_on', 'directions_bike', 'local_pizza',
  'favorite', 'person', 'storefront', 'laptop_mac', 'subscriptions',
  'spa', 'build', 'security', 'volunteer_activism', 'diamond',
  'redeem', 'local_pharmacy', 'lunch_dining', 'delivery_dining', 'work',
];

export const PREVIEW_5_ICONS: string[] = [
  'restaurant', 'shopping_bag', 'directions_car', 'home', 'payments',
];

export interface ThemeColorSpec {
  id: ThemeColorOption;
  label: string;
  labelBn: string;
  primary: string;
  secondary: string;
}

export const THEME_COLOR_PRESETS: ThemeColorSpec[] = [
  { id: 'INDIGO_NIGHT', label: 'Indigo Night', labelBn: 'ইন্ডিগো নাইট', primary: '#4F46E5', secondary: '#6366F1' },
  { id: 'ROYAL_VIOLET', label: 'Royal Violet', labelBn: 'রয়্যাল ভায়োলেট', primary: '#7C3AED', secondary: '#8B5CF6' },
  { id: 'EMERALD_GREEN', label: 'Emerald Green', labelBn: 'এমেরাল্ড গ্রিন', primary: '#059669', secondary: '#10B981' },
  { id: 'OCEAN_BLUE', label: 'Ocean Blue', labelBn: 'ওশান ব্লু', primary: '#2563EB', secondary: '#3B82F6' },
  { id: 'SUNSET_ORANGE', label: 'Sunset Orange', labelBn: 'সানসেট অরেঞ্জ', primary: '#EA580C', secondary: '#F97316' },
  { id: 'ROSE_PINK', label: 'Rose Pink', labelBn: 'রোজ পিংক', primary: '#E11D48', secondary: '#FB7185' },
  { id: 'AQUA_TEAL', label: 'Aqua Teal', labelBn: 'অ্যাকুয়া টিল', primary: '#0D9488', secondary: '#14B8A6' },
  { id: 'GOLDEN_AMBER', label: 'Golden Amber', labelBn: 'গোল্ডেন অ্যাম্বার', primary: '#D97706', secondary: '#F59E0B' },
  { id: 'CRIMSON_RED', label: 'Crimson Red', labelBn: 'ক্রিমসন রেড', primary: '#DC2626', secondary: '#EF4444' },
  { id: 'LIME_FRESH', label: 'Lime Fresh', labelBn: 'লাইম ফ্রেশ', primary: '#65A30D', secondary: '#84CC16' },
  { id: 'SKY_CYAN', label: 'Sky Cyan', labelBn: 'স্কাই সায়ান', primary: '#0284C7', secondary: '#38BDF8' },
  { id: 'CORAL_PEACH', label: 'Coral Peach', labelBn: 'কোরাল পিচ', primary: '#F43F5E', secondary: '#FB7185' },
  { id: 'GRAPHITE', label: 'Graphite', labelBn: 'গ্রাফাইট', primary: '#334155', secondary: '#475569' },
];

export const BACKGROUND_TEXTURE_OPTIONS: Array<{
  id: BackgroundTextureOption;
  label: string;
  labelBn: string;
}> = [
  { id: 'AURORA', label: 'Aurora', labelBn: 'অরোরা' },
  { id: 'WAVES', label: 'Waves', labelBn: 'তরঙ্গ' },
  { id: 'DOTS', label: 'Dots', labelBn: 'ডটস' },
  { id: 'GRID', label: 'Grid', labelBn: 'গ্রিড' },
  { id: 'SILK_LINES', label: 'Silk lines', labelBn: 'সিল্ক লাইন' },
  { id: 'PLAIN', label: 'Plain', labelBn: 'সাধারণ' },
  { id: 'COLOUR_MESH', label: 'Colour mesh', labelBn: 'কালার মেশ' },
];

export function getThemeColors(option: ThemeColorOption): ThemeColorSpec {
  return THEME_COLOR_PRESETS.find((t) => t.id === option) ?? THEME_COLOR_PRESETS[10]; // SKY_CYAN default
}
