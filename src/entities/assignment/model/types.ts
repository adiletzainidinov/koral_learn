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
  teacherComment?: string;
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

// Base points for intermediate assignments
const BASE_POINTS: Record<AssignmentStatus, number> = {
  pending:  0,
  not_done: 0,
  done:     1,
  good:     2,
  excellent: 3,
};

const TYPE_MULTIPLIER: Record<AssignmentType, number> = {
  intermediate: 1,
  homework:     2,
};

/**
 * Central points calculation.
 * intermediate: done=1, good=2, excellent=3
 * homework:     done=2, good=4, excellent=6
 */
export function getAssignmentPoints(status: AssignmentStatus, type?: AssignmentType): number {
  const base = BASE_POINTS[status];
  if (base === 0) return 0;
  const multiplier = type ? TYPE_MULTIPLIER[type] : TYPE_MULTIPLIER.intermediate;
  return base * multiplier;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  dueDate?: string;
  assignmentType?: AssignmentType;
  attachments?: AssignmentAttachment[];
  teacherComment?: string;
}

export interface CreateAssignmentInput {
  studentId: string;
  title: string;
  description: string;
  dueDate?: string;
  imageUrl?: string;
  assignmentType: AssignmentType;
  attachments: AssignmentAttachment[];
}
