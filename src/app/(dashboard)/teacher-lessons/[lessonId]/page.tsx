import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { teacherLessons, getTeacherLesson } from '@/entities/teacher-lesson/model/catalog';
import { TeacherLessonViewer } from '@/widgets/teacher-lessons/viewer';

export function generateStaticParams() {
  return teacherLessons.map((lesson) => ({ lessonId: lesson.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  return { title: getTeacherLesson(lessonId)?.title.ru ?? 'Уроки для устаза' };
}

export default async function TeacherLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = getTeacherLesson(lessonId);
  if (!lesson) notFound();
  return <TeacherLessonViewer key={lesson.id} lesson={lesson} />;
}
