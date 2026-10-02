import { Course } from './courses';

export function getStudyTopicContext(selection: string, courses: Pick<Course, 'id' | 'title'>[], fallback = 'Study Material') {
  const course = courses.find(item => selection.startsWith(`${item.title}: `));
  if (!course) return { courseId: '', topic: selection.trim() || fallback };
  return { courseId: course.id, topic: selection.slice(course.title.length + 2).trim() || fallback };
}