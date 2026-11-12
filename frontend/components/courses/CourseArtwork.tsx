'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Course } from '@/lib/courses';
import { courseImageUrl } from '@/lib/courses';

type Props = {
  course: Course;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export default function CourseArtwork({ course, className = '', imageClassName = '', priority = false }: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-surface2 ${className}`}>
      {failed
        ? <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-surface2 via-surface to-surface3 px-5 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-accent"><BookOpen size={22} /></span>
          <span className="font-dm-serif text-lg text-text">{course.title}</span>
          <span className="mt-1 max-w-sm text-[13px] leading-relaxed text-text3">{course.desc}</span>
        </div>
        : <img
          src={courseImageUrl(course.image)}
          alt={`${course.title} illustration`}
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imageClassName}`}
        />}
    </div>
  );
}
