export type PreferredContact = 'whatsapp' | 'phone' | 'telegram' | 'instagram';

export interface Parent {
  id: string;
  fullName: string;
  whatsapp: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  address?: string;
  /** Free-text relation label. Legacy stored values: 'mother' | 'father' | 'guardian' | 'relative' | 'other' */
  relation?: string;
  preferredContact?: PreferredContact;
  description?: string;
  notes?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateParentInput {
  fullName: string;
  whatsapp: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  address?: string;
  relation?: string;
  preferredContact?: PreferredContact;
  description?: string;
  notes?: string;
}

export type UpdateParentInput = Partial<Omit<Parent, 'id' | 'createdAt'>>;

const LEGACY_RELATION_MAP: Record<string, string> = {
  mother: 'Мама',
  father: 'Папа',
  guardian: 'Опекун',
  relative: 'Родственник',
  other: 'Другое',
};

/** Normalizes old enum values to display strings, passes free-text through as-is. */
export function normalizeParentRelation(value?: string): string {
  if (!value) return 'Не указано';
  return LEGACY_RELATION_MAP[value] ?? value;
}

export const PARENT_RELATION_OPTIONS: string[] = [
  'Мама',
  'Папа',
  'Бабушка',
  'Дедушка',
  'Старший брат',
  'Старшая сестра',
  'Брат',
  'Сестра',
  'Дядя',
  'Тётя',
  'Опекун',
  'Приёмный родитель',
  'Отчим',
  'Мачеха',
  'Родственник',
  'Сосед',
  'Устаз',
  'Друг семьи',
  'Другое',
];

export const PREFERRED_CONTACT_LABELS: Record<PreferredContact, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Телефон',
  telegram: 'Telegram',
  instagram: 'Instagram',
};
