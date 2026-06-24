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

export interface FamilyContact {
  id: string;
  familyId: string;
  fullName: string;
  whatsapp: string;
  phone?: string;
  telegram?: string;
  instagram?: string;
  preferredContact?: PreferredContactMethod;
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
