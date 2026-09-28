import { ReactNode } from 'react';
export default function Badge({ children, color = '#4f8ef7' }: { children: ReactNode; color?: string }) {
  return <span style={{ fontSize:11, fontWeight:600, background:`${color}22`, color, border:`1px solid ${color}44`, borderRadius:20, padding:'2px 10px' }}>{children}</span>;
}
