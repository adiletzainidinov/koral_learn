import type {
  SupportPlanType, PaymentStatus, SupportPlan, LessonType, LessonSelection, Family,
  SupportPayment, SupportPaymentDistribution, SupportPaymentAllocation,
  SupportMonthlyCharge,
} from './types';
import type { FamilyContact } from '@/entities/family-contact/model/types';

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

export const SUPPORT_PLANS: Record<SupportPlanType, SupportPlan> = {
  open_learning: {
    id: 'open_learning',
    name: 'Открытое обучение',
    description: 'Для семей, которые пока не делают взносы. Дети приходят на занятия и участвуют в общей мотивации.',
    features: [
      'Посещение уроков',
      'Обучение при поддержке старших учеников',
      'Базовая мотивация и малые поощрения',
      'Базовый контроль прогресса',
    ],
    educationLogic: 'Обучение в общей группе при поддержке более опытных учеников устаза.',
    priorityLevel: 1,
    emoji: '🕌',
  },
  family_support: {
    id: 'family_support',
    name: 'Семейная поддержка',
    description: 'Стандартный формат со скидкой для многодетных семей.',
    monthlyBasePrice: 1000,
    maxFamilyPrice: 2000,
    features: [
      'Обучение через лучших учеников устаза',
      'Регулярная проверка заданий',
      'Базовый приоритет',
      'Участие во всех мотивационных активностях',
    ],
    educationLogic: '1 ребёнок — 1000, 2 — 1500, 3 — 1800, 4+ — максимум 2000 сом.',
    priorityLevel: 2,
    emoji: '👨‍👩‍👧‍👦',
  },
  focused_learning: {
    id: 'focused_learning',
    name: 'Усиленное обучение',
    description: 'Дополнительное внимание устаза и приоритет в проверке заданий.',
    monthlyBasePrice: 2000,
    features: [
      'Повышенное внимание со стороны устаза',
      'Приоритет в проверке заданий',
      'Более частый контроль прогресса',
      'Приоритет в поощрениях',
    ],
    educationLogic: 'Каждый ребёнок — 2000 сом в месяц. Усиленный контроль.',
    priorityLevel: 3,
    emoji: '📖',
  },
  private_group: {
    id: 'private_group',
    name: 'Индивидуальная группа',
    description: 'Отдельные занятия для небольшой группы до 5 человек.',
    monthlyBasePrice: 5000,
    features: [
      'Отдельное занятие',
      'Группа до 5 человек',
      'Персональный план обучения',
      'Максимальное внимание устаза',
      'Индивидуальный контроль прогресса',
    ],
    educationLogic: 'Каждый участник — 5000 сом. Рекомендуется до 5 человек.',
    priorityLevel: 4,
    emoji: '⭐',
  },
  custom: {
    id: 'custom',
    name: 'Особый формат',
    description: 'Индивидуальные условия, согласованные с устазом.',
    features: [
      'Индивидуальный договор',
      'Гибкие условия оплаты',
      'Особый формат занятий',
    ],
    educationLogic: 'Сумма указывается вручную.',
    priorityLevel: 5,
    emoji: '✏️',
  },
};

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  quran_group: 'Общая группа Корана',
  muallim_sani: 'Муаллим сани',
  tajweed: 'Таджвид',
  hifz: 'Хифз',
  individual: 'Индивидуальные',
  custom: 'Особый',
};

// ─── Core calculation functions ───────────────────────────────────────────────

export function calculateFamilySupportAmount(studentCount: number): number {
  if (studentCount <= 0) return 0;
  if (studentCount === 1) return 1000;
  if (studentCount === 2) return 1500;
  if (studentCount === 3) return 1800;
  return 2000;
}

export function calculateFocusedLearningAmount(studentCount: number): number {
  return Math.max(0, studentCount) * 2000;
}

export function calculatePrivateGroupAmount(studentCount: number): number {
  return Math.max(0, studentCount) * 5000;
}

export function calculateExpectedPayment(planType: SupportPlanType, studentCount: number): number {
  switch (planType) {
    case 'open_learning': return 0;
    case 'family_support': return calculateFamilySupportAmount(studentCount);
    case 'focused_learning': return calculateFocusedLearningAmount(studentCount);
    case 'private_group': return calculatePrivateGroupAmount(studentCount);
    case 'custom': return 0;
  }
}

/** Calculate amount from per-student lessonSelections (mixed plan support) */
export function calculateMixedAmount(lessonSelections: LessonSelection[]): number {
  const active = lessonSelections.filter((s) => s.isActive);

  const familySupportCount = active.filter((s) => s.planType === 'family_support').length;
  const focusedCount = active.filter((s) => s.planType === 'focused_learning').length;
  const privateCount = active.filter((s) => s.planType === 'private_group').length;
  const customAmount = active
    .filter((s) => s.planType === 'custom')
    .reduce((sum, s) => sum + s.monthlyAmount, 0);

  return (
    calculateFamilySupportAmount(familySupportCount) +
    calculateFocusedLearningAmount(focusedCount) +
    calculatePrivateGroupAmount(privateCount) +
    customAmount
  );
}

/**
 * Main entry point — uses lessonSelections when available, falls back to
 * legacy supportPlanType × studentIds.length for old records.
 */
export function calculateFamilyExpectedAmount(family: Family): number {
  if (family.lessonSelections && family.lessonSelections.length > 0) {
    return calculateMixedAmount(family.lessonSelections);
  }
  return calculateExpectedPayment(family.supportPlanType, family.studentIds.length);
}

/** Auto-calculate monthlyAmount for a single selection (not custom) */
export function getSelectionAmount(planType: SupportPlanType): number {
  switch (planType) {
    case 'family_support': return 1000;   // per-student preview (full calc depends on group size)
    case 'focused_learning': return 2000;
    case 'private_group': return 5000;
    case 'open_learning': return 0;
    case 'custom': return 0;
  }
}

/** Derive the dominant plan type from lesson selections (for display) */
export function derivePlanType(lessonSelections: LessonSelection[]): SupportPlanType {
  if (lessonSelections.length === 0) return 'family_support';
  const counts = new Map<SupportPlanType, number>();
  for (const sel of lessonSelections) {
    counts.set(sel.planType, (counts.get(sel.planType) ?? 0) + 1);
  }
  let max = 0;
  let dominant: SupportPlanType = 'family_support';
  for (const [plan, count] of counts) {
    if (count > max) { max = count; dominant = plan; }
  }
  return dominant;
}

// ─── Payment helpers ──────────────────────────────────────────────────────────

export function getPaymentStatus(expectedAmount: number, paidAmount: number): PaymentStatus {
  if (expectedAmount === 0) return 'paid';
  if (paidAmount <= 0) return 'unpaid';
  if (paidAmount > expectedAmount) return 'overpaid';
  if (paidAmount >= expectedAmount) return 'paid';
  return 'partial';
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Не оплачено',
  partial: 'Частично',
  paid: 'Оплачено',
  overpaid: 'Переплата',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Наличные',
  mbank: 'M-Bank',
  obank: 'O!Bank',
  bank_transfer: 'Банк',
  other: 'Другое',
};

export const PLAN_COLORS: Record<SupportPlanType, { badge: string; light: string; text: string; border: string }> = {
  open_learning:   { badge: 'bg-slate-100 text-slate-600',   light: 'bg-slate-50',   text: 'text-slate-600',   border: 'border-slate-200' },
  family_support:  { badge: 'bg-emerald-100 text-emerald-700', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  focused_learning:{ badge: 'bg-blue-100 text-blue-700',     light: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  private_group:   { badge: 'bg-violet-100 text-violet-700', light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200' },
  custom:          { badge: 'bg-amber-100 text-amber-700',   light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
};

export const STATUS_COLORS: Record<PaymentStatus, { badge: string }> = {
  unpaid:  { badge: 'bg-slate-100 text-slate-600' },
  partial: { badge: 'bg-amber-100 text-amber-700' },
  paid:    { badge: 'bg-emerald-100 text-emerald-700' },
  overpaid:{ badge: 'bg-blue-100 text-blue-700' },
};

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ru-RU')} сом`;
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const name = MONTHS[Number(m) - 1] ?? month;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

export function getReminderMessage(parentName: string, remaining: number, month: string): string {
  const [year, m] = month.split('-');
  const monthName = MONTHS[Number(m) - 1] ?? month;
  return `Ассаламу алейкум! Напоминаем, что за ${monthName} ${year} осталось оплатить ${formatAmount(remaining)} за обучение детей. Спасибо за поддержку обучения Корана.`;
}

// ─── SupportPayment helpers ───────────────────────────────────────────────────

/** Sum of appliedAmount for a given student across the provided payment list (incl. advance_usage allocations). */
export function getStudentMonthPaid(studentId: string, payments: SupportPayment[]): number {
  let total = 0;
  for (const p of payments) {
    if (p.studentId === studentId) {
      total += p.appliedAmount;
    } else if (!p.studentId && p.distribution) {
      const d = p.distribution.find((x) => x.studentId === studentId);
      if (d) total += d.amount;
    } else if (!p.studentId && p.allocations) {
      const a = p.allocations.find((x) => x.studentId === studentId);
      if (a) total += a.amount;
    }
  }
  return total;
}

/**
 * Distribute appliedAmount sequentially among students with outstanding debt.
 * Students are iterated in the order provided.
 */
export function distributeAmongStudents(
  appliedAmount: number,
  students: Array<{ id: string; expectedAmount: number; alreadyPaid: number }>
): SupportPaymentDistribution[] {
  const result: SupportPaymentDistribution[] = [];
  let rem = appliedAmount;
  for (const s of students) {
    if (rem <= 0) break;
    const need = Math.max(0, s.expectedAmount - s.alreadyPaid);
    if (need <= 0) continue;
    const give = Math.min(rem, need);
    result.push({ studentId: s.id, amount: give });
    rem -= give;
  }
  return result;
}

/**
 * How much of a specific advance-creating payment has been consumed by advance_usage records.
 * Since advance_usage records are not linked to a specific source payment, we use:
 *   usedFromThis = max(0, totalUsed − advanceCreatedByOtherPayments)
 */
export function calculateUsedAdvanceFromPayment(paymentId: string, allPayments: SupportPayment[]): number {
  const totalUsed = allPayments
    .filter((p) => p.kind === 'advance_usage')
    .reduce((s, p) => s + p.appliedAmount, 0);
  const otherAdvanceCreated = allPayments
    .filter((p) => p.overpaymentType === 'advance' && p.id !== paymentId)
    .reduce((s, p) => s + p.overpaidAmount, 0);
  return Math.max(0, totalUsed - otherAdvanceCreated);
}

/**
 * Available advance = sum of all advance overpayments created
 *                   − sum of all advance_usage appliedAmounts.
 */
export function calculateAvailableAdvance(payments: SupportPayment[]): number {
  const created = payments
    .filter((p) => p.overpaymentType === 'advance')
    .reduce((s, p) => s + p.overpaidAmount, 0);
  const used = payments
    .filter((p) => p.kind === 'advance_usage')
    .reduce((s, p) => s + p.appliedAmount, 0);
  return Math.max(0, created - used);
}

/** Sum of appliedAmount for all payments (including advance_usage) for the given month. */
export function calculatePaidForMonth(payments: SupportPayment[], month: string): number {
  return payments
    .filter((p) => p.month === month)
    .reduce((s, p) => s + p.appliedAmount, 0);
}

/** Cumulative gift / hadia amount across all time. */
export function calculateGiftTotal(payments: SupportPayment[]): number {
  return payments
    .filter((p) => p.overpaymentType === 'gift')
    .reduce((s, p) => s + p.overpaidAmount, 0);
}

export function getThankYouMessage(parentName: string, month: string): string {
  const [year, m] = month.split('-');
  const monthName = MONTHS[Number(m) - 1] ?? month;
  return `Ассаламу алейкум! Оплата за ${monthName} ${year} от ${parentName} получена. Пусть Аллах даст баракат вашей семье за поддержку обучения Корана. 🌿`;
}

// ─── Payment preparation ──────────────────────────────────────────────────────

/**
 * Pure calculation of how to split a received payment.
 * Returns appliedAmount (goes to the month's debt), overpaidAmount (excess),
 * and the distribution across students.
 */
export function prepareSupportPayment(
  receivedAmount: number,
  expectedAmount: number,
  alreadyPaidAmount: number,
  students: Array<{ id: string; expectedAmount: number; alreadyPaid: number }>
): {
  remainingAmount: number;
  appliedAmount: number;
  overpaidAmount: number;
  distribution: SupportPaymentDistribution[];
} {
  const remainingAmount = Math.max(0, expectedAmount - alreadyPaidAmount);
  const appliedAmount = Math.min(receivedAmount, remainingAmount);
  const overpaidAmount = Math.max(0, receivedAmount - remainingAmount);
  const distribution = students.length > 0 ? distributeAmongStudents(appliedAmount, students) : [];
  return { remainingAmount, appliedAmount, overpaidAmount, distribution };
}

// ─── Monthly charge helpers ───────────────────────────────────────────────────

/** Get expected amount: from snapshot if available, otherwise compute from current family state. */
export function getExpectedForMonth(family: Family, charge: SupportMonthlyCharge | null): number {
  if (charge) return charge.expectedAmount;
  return calculateFamilyExpectedAmount(family);
}

/** Get per-student expected amount for a month. */
export function getStudentExpectedForMonth(
  studentId: string,
  family: Family,
  charge: SupportMonthlyCharge | null
): number {
  if (charge) {
    const sc = charge.studentCharges.find((s) => s.studentId === studentId);
    return sc?.expectedAmount ?? 0;
  }
  const sel = family.lessonSelections?.find((ls) => ls.studentId === studentId && ls.isActive);
  return sel?.monthlyAmount ?? 0;
}

/** Build student charges array from current family state (for snapshot creation). */
export function buildStudentChargesFromFamily(family: Family): SupportMonthlyCharge['studentCharges'] {
  if (!family.lessonSelections || family.lessonSelections.length === 0) return [];
  return family.lessonSelections
    .filter((ls) => ls.isActive)
    .map((ls) => ({
      studentId: ls.studentId,
      planType: ls.planType,
      expectedAmount: ls.monthlyAmount,
    }));
}

// ─── Reminder recipient ───────────────────────────────────────────────────────

/**
 * Select the best contact to send a reminder to.
 * Priority: billingContactId → primaryContactId → first with WhatsApp → first active contact.
 */
export function selectReminderRecipient(
  family: Family,
  contacts: FamilyContact[]
): FamilyContact | null {
  const active = contacts.filter((c) => !c.isArchived);
  if (family.billingContactId) {
    const c = active.find((c) => c.id === family.billingContactId);
    if (c) return c;
  }
  if (family.primaryContactId) {
    const c = active.find((c) => c.id === family.primaryContactId);
    if (c) return c;
  }
  const withWa = active.find((c) => c.whatsapp);
  if (withWa) return withWa;
  return active[0] ?? null;
}

/** Days since a given ISO date string. Returns null if dateStr is falsy. */
export function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Format relative time for last reminder. */
export function formatReminderAge(dateStr: string | null | undefined): string | null {
  const days = daysSince(dateStr);
  if (days === null) return null;
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Вчера';
  if (days < 7) return `${days} дн. назад`;
  if (days < 30) return `${Math.floor(days / 7)} нед. назад`;
  return `${Math.floor(days / 30)} мес. назад`;
}
