export type SupportPlanType = 'open_learning' | 'family_support' | 'focused_learning' | 'private_group';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export type PaymentMethod = 'cash' | 'mbank' | 'obank' | 'bank_transfer' | 'other';
export type PaymentAction = 'created' | 'updated' | 'paid' | 'partial_paid' | 'refund';

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
  /** Primary parent entity reference — source of truth for contact data */
  parentId?: string;
  /** Display name — derived from parent on creation, or legacy manual entry */
  name: string;
  /** Legacy: kept for backward compat with old localStorage data */
  parentName?: string;
  /** Legacy: kept for backward compat with old localStorage data */
  parentPhone?: string;
  notes?: string;
  studentIds: string[];
  supportPlanType: SupportPlanType;
  createdAt: string;
  updatedAt?: string;
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
  supportPlanType: SupportPlanType;
  notes?: string;
}

export type UpdateFamilyInput = Partial<Omit<Family, 'id' | 'createdAt'>>;
