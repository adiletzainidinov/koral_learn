import type { SupportPlanType, PaymentStatus, SupportPlan } from './types';

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
};

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
  }
}

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
  open_learning: { badge: 'bg-slate-100 text-slate-600', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  family_support: { badge: 'bg-emerald-100 text-emerald-700', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  focused_learning: { badge: 'bg-blue-100 text-blue-700', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  private_group: { badge: 'bg-violet-100 text-violet-700', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
};

export const STATUS_COLORS: Record<PaymentStatus, { badge: string }> = {
  unpaid: { badge: 'bg-slate-100 text-slate-600' },
  partial: { badge: 'bg-amber-100 text-amber-700' },
  paid: { badge: 'bg-emerald-100 text-emerald-700' },
  overpaid: { badge: 'bg-blue-100 text-blue-700' },
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

export function getReminderMessage(familyName: string, remaining: number, month: string): string {
  const [year, m] = month.split('-');
  const monthName = MONTHS[Number(m) - 1] ?? month;
  return `Ассаламу алейкум! Напоминаем, что за ${monthName} ${year} осталось оплатить ${formatAmount(remaining)} за обучение детей семьи «${familyName}». Спасибо за поддержку обучения Корана.`;
}

export function getThankYouMessage(familyName: string, month: string): string {
  const [year, m] = month.split('-');
  const monthName = MONTHS[Number(m) - 1] ?? month;
  return `Ассаламу алейкум! Оплата за ${monthName} ${year} от семьи «${familyName}» получена. Пусть Аллах даст баракат вашей семье за поддержку обучения Корана. 🌿`;
}
