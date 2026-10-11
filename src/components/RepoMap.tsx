"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
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

export function RepoMap({ index, selected, onSelect, marks, focus, trail }: {
  index: RepoIndex; selected: string | null; onSelect: (p: string) => void;
  /** dosya → bulgu rengi (analiz) */
  marks?: Map<string, string>;
  /** sohbetin vurguladığı dosyalar ve sıralı istek yolu */
  focus?: Set<string>;
  trail?: string[];
}) {
  const { nodes, pos, color, box, labels } = useLayout(index);
  const [view, setView] = useState(box);
  const viewRef = useRef(view);
  viewRef.current = view;
  const tween = useRef<number | null>(null);

  // Görünümü yumuşakça hedefe taşı (kamera hareketi)
  function animateTo(t: typeof box, ms = 900) {
    if (tween.current) cancelAnimationFrame(tween.current);
    const from = viewRef.current, t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      setView({ x: from.x + (t.x - from.x) * e, y: from.y + (t.y - from.y) * e, w: from.w + (t.w - from.w) * e, h: from.h + (t.h - from.h) * e });
      if (p < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
  }

  // Sohbet yeni dosyalar vurguladığında haritayı onlara odakla
  const focusKey = [...(focus ?? [])].join("|") + "#" + (trail ?? []).join("|");
  useEffect(() => {
    const ids = [...(focus ?? []), ...(trail ?? [])].filter((id) => pos.has(id));
    if (!ids.length) { animateTo(box); return; }
    const ns = ids.map((id) => pos.get(id)!);
    const minX = Math.min(...ns.map((n) => n.x! - n.r)), maxX = Math.max(...ns.map((n) => n.x! + n.r));
    const minY = Math.min(...ns.map((n) => n.y! - n.r)), maxY = Math.max(...ns.map((n) => n.y! + n.r));
    const pad = 110, w = Math.max(maxX - minX + pad * 2, box.w * 0.45), h = Math.max(maxY - minY + pad * 2, box.h * 0.45);
    animateTo({ x: (minX + maxX) / 2 - w / 2, y: (minY + maxY) / 2 - h / 2, w, h });
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kod paneli haritanın sağ %46'sını kaplıyor: seçilen düğümü görünür sol bölgeye kaydır
  useEffect(() => {
    if (!selected || !pos.has(selected)) return;
    const n = pos.get(selected)!, v = viewRef.current;
    const rx = (n.x! - v.x) / v.w;
    if (rx > 0.08 && rx < 0.5) return;
    animateTo({ ...v, x: n.x! - v.w * 0.28, y: n.y! - v.h * 0.5 }, 700);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const groupIndex = useMemo(() => new Map([...new Set(nodes.map((n) => n.group))].map((g, i) => [g, i])), [nodes]);
  const [hover, setHover] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const near = useMemo(() => {
    if (focus && focus.size && !hover) return new Set([...focus, ...(trail ?? [])]);
    const id = hover ?? selected;
    if (!id) return null;
    return new Set([id, ...index.edges.filter((e) => e.from === id || e.to === id).flatMap((e) => [e.from, e.to])]);
  }, [hover, selected, index, focus, trail]);

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
        {trail && trail.length > 1 && (() => {
          const pts = trail.map((id) => pos.get(id)).filter((p): p is N => !!p);
          const seg = (a: N, b: N) => {
            const mx = (a.x! + b.x!) / 2, my = (a.y! + b.y!) / 2, dx = b.x! - a.x!, dy = b.y! - a.y!;
            return `Q ${mx - dy * 0.18} ${my + dx * 0.18} ${b.x} ${b.y}`;
          };
          const full = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((b, i) => seg(pts[i], b)).join(" ");
          return (
            <g key={trail.join("|")}>
              {pts.slice(1).map((b, i) => (
                <motion.path key={i} d={`M ${pts[i].x} ${pts[i].y} ${seg(pts[i], b)}`} fill="none" stroke="#ff8c3a" strokeWidth={4.5} strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0.9 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 + i * 0.45, duration: 0.45, ease: "easeInOut" }}
                  style={{ filter: "drop-shadow(0 0 6px rgba(255,140,58,.8))" }} />
              ))}
              <circle r={6} fill="#fff" style={{ filter: "drop-shadow(0 0 8px #ffb070)" }} opacity={0}>
                <animate attributeName="opacity" from="0" to="1" begin={`${0.5 + pts.length * 0.45}s`} dur="0.3s" fill="freeze" />
                <animateMotion path={full} dur={`${Math.max(2, pts.length * 0.6)}s`} begin={`${0.5 + pts.length * 0.45}s`} repeatCount="indefinite" />
              </circle>
            </g>
          );
        })()}
        {nodes.map((n) => {
          const dim = near && !near.has(n.id);
          const sel = n.id === selected;
          return (
            <g key={n.id} transform={`translate(${n.x},${n.y})`} opacity={dim ? 0.25 : 1} className="cursor-pointer" style={{ transition: "opacity .5s" }}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}
              onClick={(e) => { e.stopPropagation(); onSelect(n.id); }}>
              {marks?.get(n.id) && (
                <circle r={n.r + 6} fill="none" stroke={marks.get(n.id)} strokeWidth={2.5} strokeDasharray="5 3" className="animate-[spin_12s_linear_infinite]" />
              )}
              <circle r={n.r} fill={marks?.get(n.id) ?? color.get(n.group)} fillOpacity={marks?.get(n.id) ? 0.35 : 0.22}
                stroke={sel ? "#ff8c3a" : marks?.get(n.id) ?? color.get(n.group)} strokeWidth={sel ? 3 : 1.5} />
              <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + (groupIndex.get(n.group) ?? 0) * 0.09 + (n.r % 7) * 0.02, type: "spring", stiffness: 260, damping: 18 }}>
              {focus?.has(n.id) && <circle r={n.r + 10} fill="#ff8c3a" className="animate-[pulse_1.6s_ease-in-out_infinite]" opacity={0.22} />}
              {trail && trail.indexOf(n.id) >= 0 && (
                <motion.g key={trail.join("|")} transform={`translate(${n.r * 0.75},${-n.r * 0.75})`}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 + trail.indexOf(n.id) * 0.45, type: "spring", stiffness: 400, damping: 15 }}>
                  <circle r={9} fill="#ff8c3a" />
                  <text textAnchor="middle" dy={4} fontSize={11} fontWeight={800} fill="#0b1220">{trail.indexOf(n.id) + 1}</text>
                </motion.g>
              )}
              {(n.r > 9.5 || sel || n.id === hover || marks?.has(n.id) || focus?.has(n.id)) && (
                <text y={n.r + 11} textAnchor="middle" fontSize={9.5} fill="#e6edf7" fontFamily="var(--font-mono)" style={{ pointerEvents: "none" }}>
                  {n.id.split("/").pop()}
                </text>
              )}
              </motion.g>
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-line bg-ink/90 px-3 py-2 font-mono text-xs">
          {hover} · {pos.get(hover)?.lines} satır · {index.fanIn.get(hover) ?? 0} yerden import
        </div>
      )}
      <button onClick={() => animateTo(box)} className="absolute right-3 top-3 rounded-lg border border-line bg-ink/80 px-2.5 py-1 text-xs text-muted hover:text-white">
        Sığdır
      </button>
    </div>
  );
}
