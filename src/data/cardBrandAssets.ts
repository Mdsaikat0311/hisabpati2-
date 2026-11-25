export interface MfsProviderInfo {
  name: string;
  brandColorHex: string;
}

export const SELECTABLE_MFS_PROVIDERS: MfsProviderInfo[] = [
  { name: 'bKash', brandColorHex: '#E2136E' },
  { name: 'Nagad', brandColorHex: '#F26522' },
  { name: 'Rocket', brandColorHex: '#8C3494' },
  { name: 'Upay', brandColorHex: '#005BAC' },
];

export const ALL_CONFIGURABLE_MFS_PROVIDERS: MfsProviderInfo[] = [
  { name: 'bKash', brandColorHex: '#E2136E' },
  { name: 'Rocket', brandColorHex: '#8C3494' },
  { name: 'Nagad', brandColorHex: '#F26522' },
  { name: 'MYCash', brandColorHex: '#00833E' },
  { name: 'Islami Bank mCash', brandColorHex: '#00843D' },
  { name: 'TAP (Trust Axiata Pay)', brandColorHex: '#E31B23' },
  { name: 'FirstPay', brandColorHex: '#0054A6' },
  { name: 'OK Banking', brandColorHex: '#ED1C24' },
  { name: 'Upay', brandColorHex: '#005BAC' },
  { name: 'Rupali Cash', brandColorHex: '#008542' },
  { name: 'TeleCash', brandColorHex: '#0066B3' },
  { name: 'Islamic Wallet', brandColorHex: '#0B6623' },
  { name: 'Meghna Bank Tap n Pay', brandColorHex: '#E30613' },
];

export const SUPPORTED_CARD_NETWORKS = ['Visa', 'Mastercard', 'American Express', 'UnionPay'];

export const POPULAR_BANKS: string[] = [
  'Agrani Bank',
  'Bangladesh Development Bank',
  'BASIC Bank',
  'Janata Bank',
  'Rupali Bank',
  'Sonali Bank',
  'Sammilito Islami Bank',
  'Bangladesh Krishi Bank',
  'Rajshahi Krishi Unnayan Bank',
  'Probashi Kallyan Bank',
  'AB Bank PLC',
  'Bangladesh Commerce Bank Limited',
  'Bank Asia PLC',
  'Bengal Commercial Bank PLC',
  'BRAC Bank PLC',
  'Citizens Bank PLC',
  'City Bank PLC',
  'Community Bank Bangladesh PLC',
  'Dhaka Bank PLC',
  'Dutch-Bangla Bank PLC',
  'Eastern Bank PLC',
  'IFIC Bank PLC',
  'Jamuna Bank PLC',
  'Meghna Bank PLC',
  'Mercantile Bank PLC',
  'Midland Bank PLC',
  'Modhumoti Bank PLC',
  'Mutual Trust Bank PLC',
  'National Bank PLC',
  'National Credit & Commerce Bank PLC',
  'NRB Bank PLC',
  'NRBC Bank PLC',
  'ONE Bank PLC',
  'Padma Bank PLC',
  'Prime Bank PLC',
  'Pubali Bank PLC',
  'SBAC Bank PLC',
  'Shimanto Bank PLC',
  'Southeast Bank PLC',
  'The Premier Bank PLC',
  'Trust Bank PLC',
  'United Commercial Bank PLC',
  'Uttara Bank PLC',
  'Al-Arafah Islami Bank PLC',
  'ICB Islamic Bank PLC',
  'Islami Bank Bangladesh PLC',
  'Shahjalal Islami Bank PLC',
  'Standard Bank PLC',
  'Citibank N.A',
  'Commercial Bank of Ceylon PLC',
  'Habib Bank Limited',
  'HSBC',
  'National Bank of Pakistan',
  'Standard Chartered Bank',
  'State Bank of India',
  'Woori Bank',
  'Ansar VDP Unnayan Bank',
  'Grameen Bank',
  'Jubilee Bank',
  'Karmashangosthan Bank',
  'Palli Sanchay Bank',
];

export function filterBanksAndInstitutions(query: string, customInstitutions: string[] = []): string[] {
  const combined: string[] = [];
  const seen = new Set<string>();
  for (const bank of POPULAR_BANKS) {
    seen.add(bank.toLowerCase());
    combined.push(bank);
  }
  for (const custom of customInstitutions) {
    const clean = custom.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      combined.push(clean);
    }
  }
  const q = query.trim().toLowerCase();
  if (!q) return combined;
  return combined.filter((b) => b.toLowerCase().includes(q));
}

export function filterMfsProviders(
  query: string,
  customProviders: MfsProviderInfo[] = []
): MfsProviderInfo[] {
  const combined: MfsProviderInfo[] = [];
  const seen = new Set<string>();
  for (const p of ALL_CONFIGURABLE_MFS_PROVIDERS) {
    seen.add(p.name.toLowerCase());
    combined.push(p);
  }
  for (const custom of customProviders) {
    const clean = custom.name.trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      combined.push({ ...custom, name: clean });
    }
  }
  const q = query.trim().toLowerCase();
  if (!q) return combined;
  return combined.filter((p) => p.name.toLowerCase().includes(q));
}

export function getMfsLogoPath(provider?: string | null): string | null {
  const p = (provider || '').trim().toLowerCase();
  if (p.includes('bkash')) return '/assets/ic_mfs_bkash.png';
  if (p.includes('nagad')) return '/assets/ic_mfs_nagad.png';
  if (p.includes('rocket')) return '/assets/ic_mfs_rocket.png';
  if (p.includes('upay')) return '/assets/ic_mfs_upay.png';
  return null;
}

export function getCardNetworkLogoPath(network?: string | null): string | null {
  const n = (network || '').trim().toLowerCase();
  if (n.includes('visa')) return '/assets/ic_net_visa.png';
  if (n.includes('master')) return '/assets/ic_net_mastercard.png';
  if (n.includes('american') || n.includes('amex')) return '/assets/ic_net_amex.png';
  if (n.includes('union')) return '/assets/ic_net_unionpay.png';
  return null;
}

export interface AccountNotesMetadata {
  network: string;
  subtype: string;
  location: string;
  tier: string;
  freeformNotes: string;
}

export function parseAccountNotesMetadata(notes: string): AccountNotesMetadata {
  const result: AccountNotesMetadata = {
    network: '',
    subtype: '',
    location: '',
    tier: '',
    freeformNotes: '',
  };
  if (!notes) return result;
  const parts = notes
    .split(/\||\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const freeform: string[] = [];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.startsWith('network:')) {
      result.network = part.slice('network:'.length).trim();
    } else if (lower.startsWith('subtype:')) {
      result.subtype = part.slice('subtype:'.length).trim();
    } else if (lower.startsWith('location:')) {
      result.location = part.slice('location:'.length).trim();
    } else if (lower.startsWith('tier:')) {
      result.tier = part.slice('tier:'.length).trim();
    } else {
      freeform.push(part);
    }
  }
  result.freeformNotes = freeform.join('\n');
  return result;
}

export function buildAccountNotesWithMetadata(meta: Partial<AccountNotesMetadata>): string {
  const tokens: string[] = [];
  if (meta.network?.trim()) tokens.push(`Network:${meta.network.trim()}`);
  if (meta.subtype?.trim()) tokens.push(`Subtype:${meta.subtype.trim()}`);
  if (meta.location?.trim()) tokens.push(`Location:${meta.location.trim()}`);
  if (meta.tier?.trim()) tokens.push(`Tier:${meta.tier.trim()}`);
  if (meta.freeformNotes?.trim()) tokens.push(meta.freeformNotes.trim());
  return tokens.join(' | ');
}
