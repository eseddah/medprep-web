import { SelectHTMLAttributes, ReactNode } from 'react';
export default function Select({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-[12px] text-text3 mb-1.5">{label}</label>}
      <select {...props} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none" style={{ fontFamily:'var(--font-outfit)' }}>{children}</select>
    </div>
  );
}
