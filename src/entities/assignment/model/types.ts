export type AssignmentStatus = 'pending' | 'not_done' | 'done' | 'good' | 'excellent';
export type AssignmentType = 'intermediate' | 'homework';

export interface AssignmentAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  base64?: string;
  createdAt: string;
}

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
  // optional for backwards-compat with existing localStorage data
  assignmentType?: AssignmentType;
  attachments?: AssignmentAttachment[];
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'На проверке',
  not_done: 'Не сделано',
  done: 'Сделано',
  good: 'Хорошо',
  excellent: 'Отлично',
};

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  intermediate: 'Промежуточная',
  homework: 'Домашняя',
};

export const ASSIGNMENT_STATUS_POINTS: Record<AssignmentStatus, number> = {
  pending: 0,
  not_done: 0,
  done: 1,
  good: 2,
  excellent: 3,
};

export interface CreateAssignmentInput {
  studentId: string;
  title: string;
  description: string;
  dueDate?: string;
  imageUrl?: string;
  assignmentType: AssignmentType;
  attachments: AssignmentAttachment[];
}
