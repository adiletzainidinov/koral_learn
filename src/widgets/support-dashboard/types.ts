import type { Family, SupportPlanType } from '@/entities/support/model/types';
import type { FamilyContact } from '@/entities/family-contact/model/types';

export type ListPaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overpaid' | 'no_charge';
export type SortKey = 'name' | 'students' | 'expected' | 'paid' | 'remaining' | 'advance' | 'status';
export type SortDir = 'asc' | 'desc';
export type DebtRange = 'any' | 'to1000' | '1000to3000' | 'over3000';

export interface SupportFamilyRow {
  familyId: string;
  familyName: string;
  /** Primary contact (display in table, used as fallback for reminder) */
  parent: FamilyContact | null;
  /** Explicit billing contact (preferred for reminders and payment receipts) */
  billingContact: FamilyContact | null;
  /** All active contacts for this family (used in search + multi-contact display) */
  contacts: FamilyContact[];
  studentCount: number;
  studentNames: string[];
  plans: SupportPlanType[];
  hasMixedPlans: boolean;
  planTooltip: string;
  expectedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  availableAdvance: number;
  giftAmount: number;
  paymentStatus: ListPaymentStatus;
  family: Family;
  /** ISO string of the most recent payment for this family */
  lastPaymentAt?: string;
  /** ISO string of the most recent reminder sent for this family+month */
  lastReminderAt?: string;
}
