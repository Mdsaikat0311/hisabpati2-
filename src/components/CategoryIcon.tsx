import React from 'react';
import {
  Utensils, ShoppingBag, Car, Home, Banknote, HeartPulse, Film, Smile,
  ShoppingCart, Plane, Users, ReceiptText, LayoutGrid, PiggyBank, TrendingUp,
  Gift, Wallet, Landmark, ArrowLeftRight, Percent, PawPrint, Dumbbell,
  Coffee, Wifi, Smartphone, UtensilsCrossed, Cookie, Fuel, ParkingSquare,
  Bus, CarTaxiFront, House, Zap, Droplets, Shirt, MonitorSmartphone, Sofa,
  Palette, Baby, WashingMachine, Stethoscope, Briefcase, PlaneTakeoff, BedDouble,
  Umbrella, BookOpen, Receipt, Gamepad2, Music, Grid, Sparkles, Star,
  RefreshCw, PieChart, Footprints, CircleDollarSign, Bike, Pizza, Heart,
  User, Store, Laptop, Repeat, Flower2, Wrench, ShieldCheck, HandHeart,
  Gem, PackageCheck, Pill, Sandwich, Truck, Building2,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  restaurant: Utensils,
  shopping_bag: ShoppingBag,
  directions_car: Car,
  home: Home,
  payments: Banknote,
  medical_services: HeartPulse,
  movie: Film,
  face: Smile,
  shopping_cart: ShoppingCart,
  flight: Plane,
  family_restroom: Users,
  receipt_long: ReceiptText,
  category: LayoutGrid,
  savings: PiggyBank,
  trending_up: TrendingUp,
  card_giftcard: Gift,
  account_balance_wallet: Wallet,
  wallet: Wallet,
  account_balance: Landmark,
  swap_horiz: ArrowLeftRight,
  groups: Users,
  percent: Percent,
  pets: PawPrint,
  fitness_center: Dumbbell,
  local_cafe: Coffee,
  wifi: Wifi,
  phone_android: Smartphone,
  flatware: UtensilsCrossed,
  fastfood: Cookie,
  local_gas_station: Fuel,
  local_parking: ParkingSquare,
  directions_bus: Bus,
  local_taxi: CarTaxiFront,
  cottage: House,
  electric_bolt: Zap,
  water_drop: Droplets,
  checkroom: Shirt,
  devices: MonitorSmartphone,
  weekend: Sofa,
  palette: Palette,
  child_care: Baby,
  local_laundry_service: WashingMachine,
  healing: Stethoscope,
  business_center: Briefcase,
  flight_takeoff: PlaneTakeoff,
  hotel: BedDouble,
  beach_access: Umbrella,
  menu_book: BookOpen,
  receipt: Receipt,
  sports_esports: Gamepad2,
  music_note: Music,
  apps: Grid,
  stroller: Baby,
  star: Star,
  update: RefreshCw,
  pie_chart: PieChart,
  directions_walk: Footprints,
  monetization_on: CircleDollarSign,
  directions_bike: Bike,
  local_pizza: Pizza,
  favorite: Heart,
  person: User,
  storefront: Store,
  laptop_mac: Laptop,
  laptop: Laptop,
  subscriptions: Repeat,
  spa: Flower2,
  build: Wrench,
  security: ShieldCheck,
  volunteer_activism: HandHeart,
  diamond: Gem,
  redeem: PackageCheck,
  local_pharmacy: Pill,
  lunch_dining: Sandwich,
  delivery_dining: Truck,
  work: Building2,
  sparkles: Sparkles,
};

export function CategoryIcon({
  iconName,
  colorHex = '#0284C7',
  size = 40,
  iconSize = 20,
  className = '',
}: {
  iconName?: string;
  colorHex?: string;
  size?: number;
  iconSize?: number;
  className?: string;
}) {
  const IconComp = ICON_MAP[(iconName || 'category').toLowerCase()] ?? LayoutGrid;
  const safeColor = colorHex || '#0284C7';

  return (
    <div
      className={`shrink-0 rounded-2xl flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${safeColor}20`,
        color: safeColor,
      }}
    >
      <IconComp size={iconSize} />
    </div>
  );
}

export function RawIcon({
  iconName,
  size = 20,
  className = '',
}: {
  iconName?: string;
  size?: number;
  className?: string;
}) {
  const IconComp = ICON_MAP[(iconName || 'category').toLowerCase()] ?? LayoutGrid;
  return <IconComp size={size} className={className} />;
}
