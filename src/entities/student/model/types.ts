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
  notes: string;
  attachments: StudentAttachment[];
  totalPoints: number;
  createdAt: string;
  isActive: boolean;
  /** Base64 JPEG, max 256×256px, stored in localStorage with the student record */
  avatar?: string;
  /** Personal contacts of the student themselves */
  studentPhone?: string;
  studentWhatsapp?: string;
  studentTelegram?: string;
  studentInstagram?: string;
  /** IDs of other students who are friends / emergency contacts */
  friendIds?: string[];
}

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

export const STUDENT_LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export type CreateStudentInput = Omit<Student, 'id' | 'createdAt' | 'totalPoints'>;
export type UpdateStudentInput = Partial<Omit<Student, 'id' | 'createdAt'>>;
