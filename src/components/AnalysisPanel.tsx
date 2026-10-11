"use client";
import { motion } from "framer-motion";
import type { Analysis, Finding } from "@/lib/analyze";
import { SEVERITY_COLOR } from "@/lib/analyze";
import type { InsightCard } from "@/app/api/insights/route";

export interface InsightState { summary?: string; cards?: InsightCard[]; ms?: number; error?: string }

const LABEL: Record<string, string> = { high: "kritik", medium: "orta", low: "düşük", info: "bilgi" };

export function AnalysisPanel({ analysis, state, onPick, onAsk }: {
  analysis: Analysis; state: InsightState; onPick: (f: Finding) => void; onAsk?: (q: string) => void;
}) {
  const s = analysis.stats;
  const kpis = [["Dosya", s.files], ["Satır", s.lines.toLocaleString("tr-TR")], ["Import", s.edges], ["Route", s.routes]];
  const byId = new Map(analysis.findings.map((f) => [f.id, f]));
  const cards = state.cards?.filter((c) => byId.has(c.id)) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {kpis.map(([l, v], i) => (
          <motion.div key={l} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-line bg-panel-2 px-2 py-2 text-center">
            <div className="font-mono text-lg font-semibold">{v}</div>
            <div className="text-[11px] text-muted">{l}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bulgular <span className="text-muted">({analysis.findings.filter((f) => f.severity !== "info").length})</span></h3>
        {state.ms !== undefined && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[11px] text-accent-2">Groq · {(state.ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn</span>
        )}
      </div>
      {state.summary && <p className="text-[13px] leading-relaxed text-muted">{state.summary}</p>}
      {state.error && <p className="text-sm text-rose-300">{state.error}</p>}
      {!state.cards && !state.error && [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-panel-2" />)}
      <div className="space-y-2">
        {cards.map((c, i) => {
          const f = byId.get(c.id)!;
          return (
            <motion.div key={c.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => onPick(f)}
              className="cursor-pointer rounded-xl border bg-panel-2 p-3 transition hover:bg-white/[0.04]"
              style={{ borderColor: SEVERITY_COLOR[f.severity] + "55" }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[f.severity] }} />
                {c.title}
                <span className="ml-auto font-mono text-[10px] uppercase" style={{ color: SEVERITY_COLOR[f.severity] }}>{LABEL[f.severity]}</span>
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-300">{c.detail}</p>
              <div className="mt-1.5 truncate font-mono text-[11px] text-muted">{f.files[0]}{f.line ? `:${f.line}` : ""}{f.files.length > 1 ? ` +${f.files.length - 1}` : ""}</div>
              {onAsk && (
                <button onClick={(e) => { e.stopPropagation(); onAsk(c.question); }} className="mt-1.5 text-left text-xs text-accent-2 hover:underline">
                  ↳ {c.question}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
