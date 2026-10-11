import { useEffect, useState } from "react";
import { listShipments } from "../api/shipments";
import { Table } from "../components/Table";

export function Shipments() {
  const [rows, setRows] = useState<{ trackingNo: string; status: string }[]>([]);
  useEffect(() => { listShipments().then(setRows); }, []);
  return <Table rows={rows} />;
}
