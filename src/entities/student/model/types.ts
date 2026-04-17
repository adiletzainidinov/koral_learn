export interface Student {
  id: string;
  fullName: string;
  age: number;
  group: string;
  level: StudentLevel;
  startedAt: string;
  parentPhone: string;
  notes: string;
  totalPoints: number;
  createdAt: string;
  isActive: boolean;
}

export type StudentLevel = 'beginner' | 'intermediate' | 'advanced';

export const STUDENT_LEVEL_LABELS: Record<StudentLevel, string> = {
  beginner: 'Начинающий',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
};

export type CreateStudentInput = Omit<Student, 'id' | 'createdAt' | 'totalPoints'>;
export type UpdateStudentInput = Partial<Omit<Student, 'id' | 'createdAt'>>;
