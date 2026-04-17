export type AssignmentStatus = 'pending' | 'not_done' | 'done' | 'good' | 'excellent';

export interface Assignment {
  id: string;
  studentId: string;
  title: string;
  description: string;
  imageUrl?: string;
  issuedAt: string;
  dueDate?: string;
  status: AssignmentStatus;
  pointsAwarded: number;
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'На проверке',
  not_done: 'Не сделано',
  done: 'Сделано',
  good: 'Хорошо',
  excellent: 'Отлично',
};

export const ASSIGNMENT_STATUS_POINTS: Record<AssignmentStatus, number> = {
  pending: 0,
  not_done: 0,
  done: 1,
  good: 2,
  excellent: 3,
};

export type CreateAssignmentInput = Pick<
  Assignment,
  'studentId' | 'title' | 'description' | 'dueDate' | 'imageUrl'
>;
