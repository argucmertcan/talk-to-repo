import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function Layout({ children, onNavigate }: { children: ReactNode; onNavigate: (p: string) => void }) {
  return <div className="layout"><Sidebar onNavigate={onNavigate} /><main>{children}</main></div>;
}
