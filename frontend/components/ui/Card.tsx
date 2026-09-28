import { ReactNode } from 'react';
import clsx from 'clsx';
export default function Card({ children, className, p = 'p-5' }: { children: ReactNode; className?: string; p?: string }) {
  return <div className={clsx('bg-surface border border-border rounded-2xl', p, className)}>{children}</div>;
}
