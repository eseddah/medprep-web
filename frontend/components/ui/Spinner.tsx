export default function Spinner({ size=16, color='#fff' }: { size?: number; color?: string }) {
  return <span style={{ width:size, height:size, border:`2px solid rgba(255,255,255,0.2)`, borderTopColor:color, borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block', flexShrink:0 }} />;
}
