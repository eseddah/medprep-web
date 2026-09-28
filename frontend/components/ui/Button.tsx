import { ReactNode } from 'react';
import clsx from 'clsx';

interface Props {
  children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button'|'submit';
  variant?: 'primary'|'ghost'|'danger'|'green'; size?: 'sm'|'md'; full?: boolean; className?: string;
}
export default function Button({ children, onClick, disabled, type='button', variant='ghost', size='md', full, className }: Props) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={clsx(
      'inline-flex items-center gap-2 font-medium rounded-lg transition-all cursor-pointer border',
      size === 'sm' ? 'px-3.5 py-1.5 text-[13px]' : 'px-5 py-2.5 text-[14px]',
      full && 'w-full justify-center',
      variant === 'primary' && 'bg-accent border-transparent text-white hover:brightness-110',
      variant === 'ghost'   && 'bg-surface3 border-border2 text-text2 hover:bg-surface2 hover:text-text',
      variant === 'danger'  && 'bg-red/10 border-red/40 text-red',
      variant === 'green'   && 'bg-green/10 border-green/30 text-green',
      disabled && 'opacity-40 cursor-not-allowed',
      className,
    )} style={{ fontFamily: 'var(--font-outfit)' }}>{children}</button>
  );
}
