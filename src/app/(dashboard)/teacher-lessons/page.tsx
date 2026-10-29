import type { Metadata } from 'next';
import { TeacherLessonLibrary } from '@/widgets/teacher-lessons/library';
import { teacherLessons } from '@/entities/teacher-lesson/model/catalog';

export const metadata: Metadata = { title: 'Уроки для устаза' };

export default function TeacherLessonsPage() {
  const lessons = teacherLessons.map(({ moments, ...lesson }) => ({ ...lesson, momentCount: moments.length }));
  return <TeacherLessonLibrary lessons={lessons} />;
}
