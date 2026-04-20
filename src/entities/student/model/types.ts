export interface StudentContact {
  id: string;
  relation: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  notes?: string;
}

export interface FriendContact {
  id: string;
  fullName: string;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  instagram?: string;
  relationNote?: string;
}

export interface StudentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  base64?: string;
  createdAt: string;
}

export interface Student {
  id: string;
  fullName: string;
  age: number;
  group: string;
  level: StudentLevel;
  startedAt: string;
  address: string;
  contacts: StudentContact[];
  friendContacts: FriendContact[];
  notes: string;
  attachments: StudentAttachment[];
  totalPoints: number;
  createdAt: string;
  isActive: boolean;
  /** Base64 JPEG, max 256×256px, stored in localStorage with the student record */
  avatar?: string;
}

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

export const STUDENT_LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export const CONTACT_RELATION_OPTIONS = [
  'Мама',
  'Папа',
  'Сам ученик',
  'Бабушка',
  'Дедушка',
  'Брат',
  'Сестра',
  'Дядя',
  'Тётя',
  'Опекун',
  'Другой',
];

export type CreateStudentInput = Omit<Student, 'id' | 'createdAt' | 'totalPoints'>;
export type UpdateStudentInput = Partial<Omit<Student, 'id' | 'createdAt'>>;
