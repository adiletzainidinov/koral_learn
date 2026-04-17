export type PointSource = 'attendance' | 'assignment' | 'bonus';

export interface PointHistoryItem {
  id: string;
  studentId: string;
  source: PointSource;
  reason: string;
  points: number;
  createdAt: string;
}

export const POINT_SOURCE_LABELS: Record<PointSource, string> = {
  attendance: 'Посещаемость',
  assignment: 'Задание',
  bonus: 'Бонус',
};
