export type SupportPlanType =
  | 'open_learning'
  | 'family_support'
  | 'focused_learning'
  | 'private_group'
  | 'custom';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export type PaymentMethod = 'cash' | 'mbank' | 'obank' | 'bank_transfer' | 'other';
export type PaymentAction = 'created' | 'updated' | 'paid' | 'partial_paid' | 'refund';

export type LessonType =
  | 'quran_group'
  | 'muallim_sani'
  | 'tajweed'
  | 'hifz'
  | 'individual'
  | 'custom';

export interface LessonSelection {
  id: string;
  studentId: string;
  lessonType: LessonType;
  planType: SupportPlanType;
  /** Auto-calculated from planType, or manual override when planType === 'custom' */
  monthlyAmount: number;
  isActive: boolean;
}

export interface SupportPlan {
  id: SupportPlanType;
  name: string;
  description: string;
  monthlyBasePrice?: number;
  maxFamilyPrice?: number;
  features: string[];
  educationLogic: string;
  priorityLevel: number;
  emoji: string;
}

export interface Family {
  id: string;
  /** Primary parent entity reference — source of truth; one parentId = one Family */
  parentId?: string;
  /** Display name — derived from parent on creation, or legacy manual entry */
  name: string;
  studentIds: string[];
  /** Per-student lesson configuration. When absent, falls back to supportPlanType */
  lessonSelections?: LessonSelection[];
  /** Default/fallback plan type — used when lessonSelections is absent */
  supportPlanType: SupportPlanType;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  /** Legacy: kept for backward compat with old localStorage data */
  parentName?: string;
  /** Legacy: kept for backward compat with old localStorage data */
  parentPhone?: string;
}

export interface FamilyPayment {
  id: string;
  familyId: string;
  month: string; // YYYY-MM
  expectedAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentHistoryItem {
  id: string;
  familyId: string;
  paymentId: string;
  amount: number;
  action: PaymentAction;
  comment?: string;
  createdAt: string;
}

export interface CreateFamilyInput {
  parentId: string;
  studentIds: string[];
  lessonSelections: LessonSelection[];
  /** Derived from lessonSelections — used for display / legacy fallback */
  supportPlanType: SupportPlanType;
  notes?: string;
}

export type UpdateFamilyInput = Partial<Omit<Family, 'id' | 'createdAt'>>;
