import data from './lessons.json';
import type { TeacherLesson } from './types';

export const teacherLessons: TeacherLesson[] = data;

export function getTeacherLesson(id: string) {
  return teacherLessons.find((lesson) => lesson.id === id);
}
