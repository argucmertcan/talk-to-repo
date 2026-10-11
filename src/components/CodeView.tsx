"use client";
import { useEffect, useRef } from "react";
import type { RepoFile } from "@/lib/types";
import { tokenize } from "@/lib/highlight";

const COLORS = { c: "#6b7f9e", s: "#fbbf24", n: "#f472b6", k: "#38bdf8", p: "#e6edf7" };

export function CodeView({ file, highlight }: { file: RepoFile; highlight?: [number, number] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!highlight || !ref.current) return;
    const el = ref.current.querySelector(`[data-line="${highlight[0]}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [file.path, highlight]);

  return (
    <div ref={ref} className="scroll-thin h-full overflow-auto bg-[#0d1117] py-2 font-mono text-[12.5px] leading-[1.6]">
      {file.content.split("\n").map((line, i) => {
        const n = i + 1;
        const hl = highlight && n >= highlight[0] && n <= highlight[1];
        return (
          <div key={i} data-line={n} className={`flex ${hl ? "bg-accent/15" : ""}`} style={{ borderLeft: `3px solid ${hl ? "#ff8c3a" : "transparent"}` }}>
            <span className="w-12 shrink-0 select-none pr-3 text-right text-[#3b4b68]">{n}</span>
            <span className="whitespace-pre pr-4">
              {tokenize(line).map((t, k) => <span key={k} style={{ color: COLORS[t.k] }}>{t.t}</span>)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
