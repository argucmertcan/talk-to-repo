"use client";
import { useMemo, useState } from "react";
import type { RepoFile } from "@/lib/types";

type Node = { name: string; path: string; children: Map<string, Node>; file?: RepoFile };

function build(files: RepoFile[]) {
  const root: Node = { name: "", path: "", children: new Map() };
  for (const f of files) {
    let cur = root;
    const parts = f.path.split("/");
    parts.forEach((p, i) => {
      const path = parts.slice(0, i + 1).join("/");
      if (!cur.children.has(p)) cur.children.set(p, { name: p, path, children: new Map() });
      cur = cur.children.get(p)!;
      if (i === parts.length - 1) cur.file = f;
    });
  }
  return root;
}

export function FileTree({ files, selected, onSelect, marks }: {
  files: RepoFile[]; selected: string | null; onSelect: (p: string) => void; marks?: Map<string, string>;
}) {
  const root = useMemo(() => build(files), [files]);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const toggle = (p: string) => setClosed((s) => { const n = new Set(s); if (n.has(p)) n.delete(p); else n.add(p); return n; });

  const render = (n: Node, depth: number): React.ReactNode[] =>
    [...n.children.values()]
      .sort((a, b) => Number(!!a.file) - Number(!!b.file) || a.name.localeCompare(b.name))
      .flatMap((c) => {
        const pad = { paddingLeft: 10 + depth * 14 };
        if (c.file) {
          const mark = marks?.get(c.path);
          return [
            <button key={c.path} onClick={() => onSelect(c.path)} style={pad}
              className={`flex w-full items-center gap-2 truncate py-[3px] pr-2 text-left font-mono text-[12.5px] hover:bg-white/5 ${selected === c.path ? "bg-accent/15 text-white" : "text-slate-300"}`}>
              {mark && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: mark }} />}
              <span className="truncate">{c.name}</span>
              <span className="ml-auto text-[10px] text-muted">{c.file.lines}</span>
            </button>,
          ];
        }
        const open = !closed.has(c.path);
        return [
          <button key={c.path} onClick={() => toggle(c.path)} style={pad}
            className="flex w-full items-center gap-1 py-[3px] text-left font-mono text-[12.5px] font-semibold text-muted hover:text-white">
            <span className="w-3">{open ? "▾" : "▸"}</span>{c.name}
          </button>,
          ...(open ? render(c, depth + 1) : []),
        ];
      });

  return <div className="scroll-thin h-full overflow-auto py-2">{render(root, 0)}</div>;
}
