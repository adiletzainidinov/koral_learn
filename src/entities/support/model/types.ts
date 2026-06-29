export type SupportPlanType =
  | 'open_learning'
  | 'family_support'
  | 'focused_learning'
  | 'private_group'
  | 'custom';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid';
export type PaymentMethod = 'cash' | 'mbank' | 'obank' | 'bank_transfer' | 'other';
export type PaymentAction = 'created' | 'updated' | 'paid' | 'partial_paid' | 'refund';
export type OverpaymentType = 'advance' | 'gift';
/** 'payment' = regular payment; 'advance_usage' = applying previously-created advance to a month */
export type SupportPaymentKind = 'payment' | 'advance_usage';

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
  badgeGiven?: boolean;
  badgeGivenAt?: string;
}

/** Per-student share of a family-level payment */
export interface SupportPaymentDistribution {
  studentId: string;
  amount: number;
}

/** Per-student allocation when applying advance to a month */
export interface SupportPaymentAllocation {
  studentId: string;
  amount: number;
}

export interface ApplyAdvanceInput {
  familyId: string;
  month: string;
  amount: number;
  allocations: SupportPaymentAllocation[];
  note?: string;
}

/**
 * A single payment transaction (new system, replaces FamilyPayment going forward).
 * studentId is undefined for family-level payments; set for per-student payments.
 */
export interface SupportPayment {
  id: string;
  familyId: string;
  month: string; // YYYY-MM
  /** undefined = whole-family payment; defined = per-student payment */
  studentId?: string;
  /** Raw amount received from parent */
  amount: number;
  /** Portion applied to outstanding debt (≤ amount) */
  appliedAmount: number;
  /** Excess beyond the debt (amount − appliedAmount) */
  overpaidAmount: number;
  /** Required when overpaidAmount > 0 */
  overpaymentType?: OverpaymentType;
  /** How appliedAmount was split across students (regular family payments) */
  distribution?: SupportPaymentDistribution[];
  /** How advance was split across students (advance_usage records) */
  allocations?: SupportPaymentAllocation[];
  /** defaults to 'payment'; 'advance_usage' means this record applies a previously-created advance */
  kind?: SupportPaymentKind;
  method?: PaymentMethod;
  note?: string;
  /** Optional: which family contact actually paid */
  paidByContactId?: string;
  /** Optional: snapshot of payer name (for "Другой человек" entries) */
  paidByNameSnapshot?: string;
  paidAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateSupportPaymentInput {
  familyId: string;
  month: string;
  studentId?: string;
  amount: number;
  appliedAmount: number;
  overpaidAmount: number;
  overpaymentType?: OverpaymentType;
  distribution?: SupportPaymentDistribution[];
  method?: PaymentMethod;
  note?: string;
  paidByContactId?: string;
  paidByNameSnapshot?: string;
}

// ─── Legacy types (kept for backward compat with old localStorage data) ────────

/** @deprecated Kept for existing localStorage data only. New payments use SupportPayment. */
export interface StudentPaymentRecord {
  studentId: string;
  expectedAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  paidAt?: string | null;
}

/** @deprecated Kept for existing localStorage data only. New payments use SupportPayment. */
export interface FamilyPayment {
  id: string;
  familyId: string;
  month: string;
  expectedAmount: number;
  paidAmount: number;
  status: PaymentStatus;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod;
  comment?: string;
  createdAt: string;
  updatedAt?: string;
  studentPayments?: StudentPaymentRecord[];
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
  /** @deprecated kept only for legacy data migration; new code uses contactIds + primaryContactId */
  parentId?: string;
  name: string;
  /** Father's full name — used as the family identity. name is auto-generated from this. */
  fatherFullName?: string;
  studentIds: string[];
  /** IDs of FamilyContact entries linked to this family */
  contactIds: string[];
  /** Primary representative for this family (must be in contactIds) */
  primaryContactId?: string;
  /** Preferred/compat payer field. Multiple contacts may have role 'payer' via FamilyContact.roles. */
  billingContactId?: string;
  lessonSelections?: LessonSelection[];
  supportPlanType: SupportPlanType;
  address?: string;
  notes?: string;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt?: string;
  parentName?: string;
  parentPhone?: string;
}

export interface CreateFamilyInput {
  /** Optional explicit name; if omitted, auto-generated from fatherFullName or primaryContact */
  name?: string;
  /** Father's full name — primary identity field for the family */
  fatherFullName?: string;
  studentIds?: string[];
  contactIds?: string[];
  primaryContactId?: string;
  billingContactId?: string;
  lessonSelections?: LessonSelection[];
  supportPlanType?: SupportPlanType;
  address?: string;
  notes?: string;
}

export type UpdateFamilyInput = Partial<Omit<Family, 'id' | 'createdAt'>>;

// ─── Monthly charge snapshot ───────────────────────────────────────────────────

/** Snapshot of expected charges for a family in a specific month. Created on first access
 *  and not changed when lesson plans change later — ensures historical accuracy. */
export interface SupportMonthlyCharge {
  id: string;
  familyId: string;
  month: string; // YYYY-MM
  /** Total expected amount for the family this month */
  expectedAmount: number;
  /** Per-student breakdown */
  studentCharges: Array<{
    studentId: string;
    planType: SupportPlanType;
    expectedAmount: number;
  }>;
  createdAt: string;
  updatedAt?: string;
}

// ─── Reminder log ──────────────────────────────────────────────────────────────

export interface SupportReminderLog {
  id: string;
  familyId: string;
  month: string;
  contactId?: string;
  contactNameSnapshot?: string;
  channel: 'whatsapp' | 'phone' | 'copy';
  createdAt: string;
  note?: string;
}

export interface CreateReminderLogInput {
  familyId: string;
  month: string;
  contactId?: string;
  contactNameSnapshot?: string;
  channel: 'whatsapp' | 'phone' | 'copy';
  note?: string;
}
