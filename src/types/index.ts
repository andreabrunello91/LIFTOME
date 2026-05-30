// ─── User ────────────────────────────────────────────────────────────────────

export type UserRole = 'both' | 'helper' | 'requester';

export interface User {
  id: string;
  name: string;
  surname: string;
  avatar_url?: string;
  initials: string;
  email: string;
  phone?: string;
  bio?: string;
  role: UserRole;
  location?: string;
  radius_km: number;
  rating: number;
  rating_count: number;
  missions_count: number;
  earnings_total: number;
  success_rate: number;
  is_available: boolean;
  is_verified: boolean;
  badges: Badge[];
  created_at: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export type CategoryId =
  | 'spesa'
  | 'cane'
  | 'consegna'
  | 'fila'
  | 'trasloco'
  | 'babysit'
  | 'altro';

export interface Category {
  id: CategoryId;
  label: string;
  emoji: string;
  color: string;       // CSS variable or hex
  bg: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { id: 'spesa',    label: 'Spesa',        emoji: '🛒', color: 'var(--or)',      bg: 'var(--or-bg)',      description: 'Supermercato, farmacia' },
  { id: 'cane',     label: 'Passeggiata',  emoji: '🐕', color: 'var(--green)',   bg: 'var(--green-bg)',   description: 'Cane o compagnia' },
  { id: 'consegna', label: 'Consegna',     emoji: '📦', color: 'var(--purple)',  bg: 'var(--purple-bg)',  description: 'Pacchi, documenti' },
  { id: 'fila',     label: 'Fila / Coda',  emoji: '⏳', color: 'var(--amber)',   bg: 'var(--amber-bg)',   description: 'Posta, banca, uffici' },
  { id: 'trasloco', label: 'Trasloco',     emoji: '🏠', color: 'var(--purple)',  bg: '#EEF2FF',           description: 'Spostamento mobili' },
  { id: 'babysit',  label: 'Babysitting',  emoji: '👶', color: '#C2186C',        bg: '#FBEAF0',           description: 'Custodia bambini' },
  { id: 'altro',    label: 'Altro',        emoji: '✨', color: 'var(--muted)',   bg: 'var(--bg)',         description: 'Qualsiasi aiuto' },
];

// ─── Request ─────────────────────────────────────────────────────────────────

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type UrgencyLevel = 'now' | 'scheduled';

export interface Request {
  id: string;
  title: string;
  description?: string;
  category: CategoryId;
  status: RequestStatus;
  urgency: UrgencyLevel;
  scheduled_at?: string;
  price: number;
  requester: User;
  helper?: User;
  address_pickup?: string;
  address_delivery: string;
  distance_m?: number;
  photos?: string[];
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
}

// ─── Mission tracking ────────────────────────────────────────────────────────

export type MissionStep = 'accepted' | 'at_store' | 'in_transit' | 'delivered';

export interface MissionUpdate {
  step: MissionStep;
  timestamp: string;
  lat?: number;
  lng?: number;
  message?: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'receipt' | 'card' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  type: MessageType;
  text?: string;
  image_url?: string;
  card_data?: Record<string, unknown>;
  created_at: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  request: Request;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  updated_at: string;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export type TransactionType = 'earning' | 'withdrawal' | 'topup' | 'refund';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  description: string;
  emoji: string;
  created_at: string;
  request_id?: string;
}

export interface PaymentCard {
  id: string;
  brand: 'visa' | 'mastercard';
  last4: string;
  exp_month: number;
  exp_year: number;
  holder: string;
  is_default: boolean;
}

// ─── Badge ───────────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  author: User;
  rating: number;
  text: string;
  category: CategoryId;
  created_at: string;
}
