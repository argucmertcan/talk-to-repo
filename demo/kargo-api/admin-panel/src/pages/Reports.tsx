import { useEffect, useState } from "react";
import { monthlyReport } from "../api/reports";
import { Table } from "../components/Table";

export function Reports() {
  const [rows, setRows] = useState<{ customer: string; total: number }[]>([]);
  useEffect(() => { monthlyReport().then(setRows); }, []);
  return <Table rows={rows} />;
}
