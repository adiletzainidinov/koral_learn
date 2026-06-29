export type FamilyRelationType =
  | 'mother'
  | 'father'
  | 'guardian'
  | 'stepmother'
  | 'stepfather'
  | 'brother'
  | 'sister'
  | 'grandmother'
  | 'grandfather'
  | 'uncle'
  | 'aunt'
  | 'cousin'
  | 'relative'
  | 'trusted_person'
  | 'other';

export const FAMILY_RELATION_LABELS: Record<FamilyRelationType, string> = {
  mother: 'Мама',
  father: 'Папа',
  guardian: 'Опекун',
  stepmother: 'Мачеха',
  stepfather: 'Отчим',
  brother: 'Брат',
  sister: 'Сестра',
  grandmother: 'Бабушка',
  grandfather: 'Дедушка',
  uncle: 'Дядя',
  aunt: 'Тётя',
  cousin: 'Двоюродный/ая',
  relative: 'Родственник',
  trusted_person: 'Доверенное лицо',
  other: 'Другое',
};

export const FAMILY_RELATION_OPTIONS: FamilyRelationType[] = [
  'mother',
  'father',
  'guardian',
  'stepmother',
  'stepfather',
  'brother',
  'sister',
  'grandmother',
  'grandfather',
  'uncle',
  'aunt',
  'cousin',
  'relative',
  'trusted_person',
  'other',
];

export type PreferredContactMethod = 'whatsapp' | 'phone' | 'telegram' | 'instagram';

export const PREFERRED_CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  whatsapp: 'WhatsApp',
  phone: 'Телефон',
  telegram: 'Telegram',
  instagram: 'Instagram',
};

export type FamilyContactRole =
  | 'payer'
  | 'education_decision_maker'
  | 'notification_recipient'
  | 'emergency_contact'
  | 'pickup_allowed'
  | 'attendance_responsible'
  | 'homework_responsible'
  | 'urgent_only';

export const FAMILY_CONTACT_ROLE_LABELS: Record<FamilyContactRole, string> = {
  payer: 'Плательщик',
  education_decision_maker: 'Принимает решения об обучении',
  notification_recipient: 'Получает уведомления',
  emergency_contact: 'Экстренный контакт',
  pickup_allowed: 'Может забирать ребёнка',
  attendance_responsible: 'Ответственный за посещаемость',
  homework_responsible: 'Ответственный за домашние задания',
  urgent_only: 'Только срочные уведомления',
};

export const ALL_FAMILY_CONTACT_ROLES: FamilyContactRole[] = [
  'payer',
  'education_decision_maker',
  'notification_recipient',
  'emergency_contact',
  'pickup_allowed',
  'attendance_responsible',
  'homework_responsible',
  'urgent_only',
];

export interface FamilyContact {
  id: string;
  familyId: string;
  fullName: string;
  whatsapp: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  preferredContact?: PreferredContactMethod;
  /** Family-level relation (e.g. 'mother', 'father') — describes who this person is in the family */
  familyRelation?: FamilyRelationType;
  customFamilyRelation?: string;
  /** Functional roles this contact has for the whole family */
  roles?: FamilyContactRole[];
  /** Free-form custom roles not covered by presets */
  customRoles?: string[];
  /** When true, contact inherits the family's address instead of having their own */
  usesFamilyAddress?: boolean;
  address?: string;
  notes?: string;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StudentFamilyContactLink {
  id: string;
  familyId: string;
  studentId: string;
  contactId: string;
  relation: FamilyRelationType;
  customRelation?: string;
  isPrimaryContact: boolean;
  canDecideEducation: boolean;
  canReceiveNotifications: boolean;
  isEmergencyContact: boolean;
  isBillingContact: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFamilyContactInput {
  familyId: string;
  fullName: string;
  whatsapp: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  preferredContact?: PreferredContactMethod;
  familyRelation?: FamilyRelationType;
  customFamilyRelation?: string;
  roles?: FamilyContactRole[];
  customRoles?: string[];
  usesFamilyAddress?: boolean;
  address?: string;
  notes?: string;
}

export type UpdateFamilyContactInput = Partial<
  Omit<FamilyContact, 'id' | 'createdAt' | 'familyId'>
>;

export interface CreateStudentContactLinkInput {
  familyId: string;
  studentId: string;
  contactId: string;
  relation: FamilyRelationType;
  customRelation?: string;
  isPrimaryContact?: boolean;
  canDecideEducation?: boolean;
  canReceiveNotifications?: boolean;
  isEmergencyContact?: boolean;
  isBillingContact?: boolean;
}

export type UpdateStudentContactLinkInput = Partial<
  Pick<
    StudentFamilyContactLink,
    | 'relation'
    | 'customRelation'
    | 'isPrimaryContact'
    | 'canDecideEducation'
    | 'canReceiveNotifications'
    | 'isEmergencyContact'
    | 'isBillingContact'
  >
>;
