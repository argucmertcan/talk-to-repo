import { StatCard } from "../components/StatCard";

export function Dashboard() {
  return <div><StatCard label="Bugünkü gönderi" value={128} /><StatCard label="Yoldaki" value={342} /></div>;
}
