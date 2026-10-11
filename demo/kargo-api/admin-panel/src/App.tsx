import { useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Shipments } from "./pages/Shipments";
import { Reports } from "./pages/Reports";
import { Users } from "./pages/Users";
import { ResetPassword } from "./pages/ResetPassword";

const PAGES = { Dashboard, Shipments, Reports, Users, ResetPassword };

export function App() {
  const [page, setPage] = useState<keyof typeof PAGES>("Dashboard");
  const Page = PAGES[page];
  return <Layout onNavigate={(p) => setPage(p as keyof typeof PAGES)}><Page /></Layout>;
}
