const ITEMS = ["Dashboard", "Shipments", "Reports", "Users"];

export function Sidebar({ onNavigate }: { onNavigate: (p: string) => void }) {
  return <nav>{ITEMS.map((i) => <button key={i} onClick={() => onNavigate(i)}>{i}</button>)}</nav>;
}
