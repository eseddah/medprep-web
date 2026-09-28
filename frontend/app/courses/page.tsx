'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { COURSES } from '@/lib/courses';

export default function CoursesPage() {
  const user = useStore(s => s.user);
  const isPro = ['pro','annual'].includes(user?.plan||'');
  const [filter, setFilter] = useState<'All'|'Medical'|'Premed'>('All');
  const filtered = filter === 'All' ? COURSES : COURSES.filter(c => c.cat === filter);

  return (
    <DashboardLayout title="Courses" sub="AI-powered lessons across 14 medical & premed subjects">
      <div className="flex gap-2 mb-6">
        {(['All','Medical','Premed'] as const).map(f => (
          <Button key={f} size="sm" variant={filter===f?'primary':'ghost'} onClick={()=>setFilter(f)}>{f}</Button>
        ))}
        <span className="ml-auto self-center text-[13px] text-text3">{filtered.length} courses</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(course => {
          const locked = !course.free && !isPro;
          return (
            <div key={course.id} className={`bg-surface border border-border rounded-2xl overflow-hidden transition-all hover:border-border2 hover:-translate-y-0.5 ${locked?'opacity-80':''}`}>
              <div className="h-1.5" style={{background:course.color}} />
              {/* Course image */}
              <div className="relative h-40 overflow-hidden bg-surface2">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover opacity-80" onError={e=>(e.currentTarget.style.display='none')} loading="lazy"/>
                <div className="absolute inset-0 flex items-center justify-center text-[48px]" style={{background:'rgba(13,15,20,0.3)'}}>{course.icon}</div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-dm-serif text-[16px] text-text">{course.title}</h3>
                  <div className="flex gap-1.5 flex-wrap justify-end ml-2">
                    <Badge color={course.cat==='Medical'?'#4f8ef7':'#3ecf8e'}>{course.cat}</Badge>
                    {course.free && <Badge color="#3ecf8e">Free</Badge>}
                    {locked && <Badge color="#f5a623">Pro</Badge>}
                  </div>
                </div>
                <p className="text-[12.5px] text-text2 leading-relaxed mb-3">{course.desc}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {course.topics.slice(0,4).map(t => (
                    <span key={t} className="text-[11px] bg-surface2 border border-border rounded-md px-2 py-0.5 text-text3">{t}</span>
                  ))}
                  {course.topics.length > 4 && <span className="text-[11px] text-text3 self-center">+{course.topics.length-4} more</span>}
                </div>
                {/* Static diagrams */}
                {course.staticImages.length > 0 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    {course.staticImages.slice(0,2).map((src,i) => (
                      <img key={i} src={src} alt="" className="h-16 rounded-lg border border-border object-contain bg-surface2 flex-shrink-0" loading="lazy" onError={e=>(e.currentTarget.style.display='none')} />
                    ))}
                  </div>
                )}
                {locked
                  ? <Link href="/billing"><Button variant="primary" full size="sm">🔒 Unlock with Pro</Button></Link>
                  : <Link href={`/courses/${course.id}`}><Button variant="primary" full size="sm">Start Learning →</Button></Link>}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
