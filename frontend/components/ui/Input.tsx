import { InputHTMLAttributes } from 'react';
export default function Input({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-[12px] text-text3 mb-1.5">{label}</label>}
      <input {...props} className="w-full bg-surface2 border border-border2 text-text rounded-lg px-3 py-2 text-[13px] outline-none focus:border-accent transition-colors placeholder:text-text3" style={{ fontFamily:'var(--font-outfit)' }} />
      {error && <p className="text-red text-[12px] mt-1">{error}</p>}
    </div>
  );
}
