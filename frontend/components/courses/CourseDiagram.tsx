import { useId } from 'react';
import type { Course } from '@/lib/courses';

export default function CourseDiagram({ course, compact = false }: { course: Course; compact?: boolean }) {
  const topics = course.topics.slice(0, 4);
  const titleId = `course-diagram-${course.id}-${useId().replace(/:/g, '')}`;

  return (
    <figure className={`w-full overflow-hidden ${compact ? 'h-full' : 'rounded-lg border border-border bg-surface2'}`}>
      <svg viewBox="0 0 700 300" className={compact ? 'h-full w-full' : 'aspect-[7/3] w-full'} role="img" aria-labelledby={titleId} preserveAspectRatio="xMidYMid meet">
        <title id={titleId}>{course.title} concept map</title>
        <rect width="700" height="300" fill="var(--surface2)" />
        <path d="M183 150 H256 M256 56 V244" fill="none" stroke={course.color} strokeOpacity=".55" strokeWidth="3" />
        {topics.map((topic, index) => {
          const centerY = 56 + index * 62;
          return (
            <g key={topic}>
              <path d={`M256 ${centerY} H292`} fill="none" stroke={course.color} strokeOpacity=".55" strokeWidth="3" />
              <circle cx="256" cy={centerY} r="5" fill={course.color} />
              <rect x="300" y={centerY - 20} width="365" height="40" rx="10" fill="var(--surface)" stroke={course.color} strokeOpacity=".45" />
              <text x="318" y={centerY + 5} fill="var(--text)" fontSize="14" fontFamily="Arial, sans-serif">{topic.length > 38 ? `${topic.slice(0, 35)}…` : topic}</text>
            </g>
          );
        })}
        <rect x="35" y="100" width="148" height="100" rx="18" fill="var(--surface)" stroke={course.color} strokeWidth="2" />
        <text x="109" y="145" textAnchor="middle" fontSize="30" aria-hidden="true">{course.icon}</text>
        <text x="109" y="173" textAnchor="middle" fill="var(--text2)" fontSize="12" fontFamily="Arial, sans-serif">COURSE MAP</text>
      </svg>
      {!compact && <figcaption className="sr-only">{course.title} connected to {topics.join(', ')}.</figcaption>}
    </figure>
  );
}
