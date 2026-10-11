"use client";
import { useMemo, useRef, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import type { RepoIndex } from "@/lib/indexer";

export const GROUP_COLORS = ["#38bdf8", "#a78bfa", "#4ade80", "#fbbf24", "#f472b6", "#2dd4bf", "#fb923c", "#94a3b8", "#60a5fa", "#e879f9", "#a3e635", "#f87171"];

type N = SimulationNodeDatum & { id: string; r: number; group: string; lines: number };

export function useLayout(index: RepoIndex) {
  return useMemo(() => {
    const groups = [...new Set(index.files.map((f) => f.group))];
    const nodes: N[] = index.files.map((f) => ({ id: f.path, r: 5 + Math.sqrt(f.lines) * 1.25, group: f.group, lines: f.lines }));
    const links = index.edges.map((e) => ({ source: e.from, target: e.to }));
    // Grupları bir çember üzerine yay; her grup kendi merkezine çekilir → okunur kümeler
    const centers = new Map(groups.map((g, i) => {
      const a = (i / groups.length) * Math.PI * 2;
      return [g, { x: Math.cos(a) * 520, y: Math.sin(a) * 330 }];
    }));
    const sim = forceSimulation(nodes)
      .force("link", forceLink(links).id((d) => (d as N).id).distance(70).strength(0.05))
      .force("charge", forceManyBody().strength(-60))
      .force("collide", forceCollide<N>().radius((d) => d.r + 6))
      .force("x", forceX<N>((d) => centers.get(d.group)!.x).strength(0.3))
      .force("y", forceY<N>((d) => centers.get(d.group)!.y).strength(0.3))
      .stop();
    for (let i = 0; i < 400; i++) sim.tick();
    const color = new Map(groups.map((g, i) => [g, GROUP_COLORS[i % GROUP_COLORS.length]]));
    const xs = nodes.map((n) => n.x!), ys = nodes.map((n) => n.y!);
    const pad = 60;
    const box = { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
    // Küme etiketleri: grubun ağırlık merkezinin üstüne
    const labels = groups.map((g) => {
      const ns = nodes.filter((n) => n.group === g);
      return { g, x: ns.reduce((s, n) => s + n.x!, 0) / ns.length, y: Math.min(...ns.map((n) => n.y! - n.r)) - 14 };
    });
    return { nodes, pos: new Map(nodes.map((n) => [n.id, n])), color, groups, box, labels };
  }, [index]);
}

export function RepoMap({ index, selected, onSelect, marks }: {
  index: RepoIndex; selected: string | null; onSelect: (p: string) => void;
  /** dosya → bulgu rengi (analiz) */
  marks?: Map<string, string>;
}) {
  const { nodes, pos, color, box, labels } = useLayout(index);
  const [view, setView] = useState(box);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const near = useMemo(() => {
    const id = hover ?? selected;
    if (!id) return null;
    return new Set([id, ...index.edges.filter((e) => e.from === id || e.to === id).flatMap((e) => [e.from, e.to])]);
  }, [hover, selected, index]);

  function onWheel(e: React.WheelEvent) {
    const r = svg.current!.getBoundingClientRect();
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const mx = view.x + ((e.clientX - r.left) / r.width) * view.w, my = view.y + ((e.clientY - r.top) / r.height) * view.h;
    setView({ x: mx - (mx - view.x) * k, y: my - (my - view.y) * k, w: view.w * k, h: view.h * k });
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svg}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={(e) => (drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y })}
        onMouseMove={(e) => {
          if (!drag.current) return;
          const r = svg.current!.getBoundingClientRect();
          const s = Math.max(view.w / r.width, view.h / r.height);
          setView({ ...view, x: drag.current.vx - (e.clientX - drag.current.x) * s, y: drag.current.vy - (e.clientY - drag.current.y) * s });
        }}
        onMouseUp={() => (drag.current = null)}
        onMouseLeave={() => (drag.current = null)}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#3b4b68" />
          </marker>
        </defs>
        {labels.map((l) => (
          <text key={l.g} x={l.x} y={l.y} textAnchor="middle" fontSize={15} fontWeight={700} fill={color.get(l.g)} opacity={0.75}
            fontFamily="var(--font-mono)" style={{ pointerEvents: "none" }}>{l.g}</text>
        ))}
        {index.edges.map((e, i) => {
          const a = pos.get(e.from)!, b = pos.get(e.to)!;
          const on = near && near.has(e.from) && near.has(e.to) && (e.from === (hover ?? selected) || e.to === (hover ?? selected));
          const dx = b.x! - a.x!, dy = b.y! - a.y!, d = Math.hypot(dx, dy) || 1;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x! - (dx / d) * b.r} y2={b.y! - (dy / d) * b.r}
              stroke={on ? "#ff8c3a" : "#22314d"} strokeWidth={on ? 1.8 : 1} opacity={near && !on ? 0.25 : 0.9} markerEnd="url(#arrow)" />
          );
        })}
        {nodes.map((n) => {
          const dim = near && !near.has(n.id);
          const sel = n.id === selected;
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.25 : 1} className="cursor-pointer"
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}>
              {marks?.get(n.id) && (
                <circle r={n.r + 6} fill="none" stroke={marks.get(n.id)} strokeWidth={2.5} strokeDasharray="5 3" className="animate-[spin_12s_linear_infinite]" />
              )}
              <circle r={n.r} fill={marks?.get(n.id) ?? color.get(n.group)} fillOpacity={marks?.get(n.id) ? 0.35 : 0.22}
                stroke={sel ? "#ff8c3a" : marks?.get(n.id) ?? color.get(n.group)} strokeWidth={sel ? 3 : 1.5} />
              {(n.r > 9.5 || sel || n.id === hover || marks?.has(n.id)) && (
                <text y={n.r + 11} textAnchor="middle" fontSize={9.5} fill="#e6edf7" fontFamily="var(--font-mono)" style={{ pointerEvents: "none" }}>
                  {n.id.split("/").pop()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-ink/90 px-3 py-2 font-mono text-xs">
          {hover} · {pos.get(hover)?.lines} satır · {index.fanIn.get(hover) ?? 0} yerden import
        </div>
      )}
      <button onClick={() => setView(box)} className="absolute right-3 top-3 rounded-lg border border-line bg-ink/80 px-2.5 py-1 text-xs text-muted hover:text-white">
        Sığdır
      </button>
    </div>
  );
}
