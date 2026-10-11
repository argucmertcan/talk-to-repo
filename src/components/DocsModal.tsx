"use client";
import { useState } from "react";
import { motion } from "framer-motion";

export interface Docs { claudeMd: string; architectureMd: string; ms?: number }

/** Basit Markdown görüntüleyici: başlık, liste, tablo, kod bloğu, kalın/inline kod */
function Md({ src }: { src: string }) {
  const out: React.ReactNode[] = [];
  const lines = src.split("\n");
  const inline = (t: string) =>
    t.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((p, i) =>
      p.startsWith("`") ? <code key={i} className="rounded bg-ink px-1 font-mono text-[12px] text-accent-2">{p.slice(1, -1)}</code>
        : p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const block: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith("```"); i++) block.push(lines[i]);
      out.push(<pre key={i} className="my-2 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-[12px] text-slate-300">{block.join("\n")}</pre>);
    } else if (/^#{1,3} /.test(l)) {
      const lvl = l.match(/^#+/)![0].length;
      out.push(<div key={i} className={lvl === 1 ? "mt-1 text-2xl font-bold" : lvl === 2 ? "mt-4 text-lg font-bold text-accent-2" : "mt-3 font-semibold"}>{inline(l.replace(/^#+ /, ""))}</div>);
    } else if (/^\s*[-*] /.test(l)) {
      out.push(<div key={i} className="flex gap-2 pl-2 text-[13.5px]"><span className="text-accent">▸</span><span>{inline(l.replace(/^\s*[-*] /, ""))}</span></div>);
    } else if (/^\|/.test(l)) {
      if (/^\|[\s:-]+\|/.test(l.replace(/[^|:\-\s]/g, "x")) && /-{3}/.test(l)) continue;
      const cells = l.split("|").slice(1, -1);
      out.push(<div key={i} className="grid gap-2 border-b border-line py-1 font-mono text-[12px]" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))` }}>{cells.map((c, k) => <span key={k} className="truncate">{inline(c.trim())}</span>)}</div>);
    } else if (l.trim()) {
      out.push(<p key={i} className="my-1 text-[13.5px] leading-relaxed text-slate-300">{inline(l)}</p>);
    }
  }
  return <>{out}</>;
}

export function DocsModal({ docs, error, onClose }: { docs: Docs | null; error?: string; onClose: () => void }) {
  const [tab, setTab] = useState<"claude" | "arch">("claude");
  const text = docs ? (tab === "claude" ? docs.claudeMd : docs.architectureMd) : "";
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    a.download = tab === "claude" ? "CLAUDE.md" : "ARCHITECTURE.md";
    a.click();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-8 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()}
        className="flex h-full max-h-[820px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          {(["claude", "arch"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 font-mono text-sm ${tab === t ? "bg-accent text-ink font-bold" : "text-muted hover:text-white"}`}>
              {t === "claude" ? "CLAUDE.md" : "ARCHITECTURE.md"}
            </button>
          ))}
          {docs?.ms !== undefined && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[11px] text-accent-2">Groq · {(docs.ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn</span>}
          <button onClick={download} disabled={!docs} className="ml-auto rounded-lg border border-line px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40">⤓ İndir</button>
          <button onClick={onClose} className="rounded-lg px-2 py-1.5 text-muted hover:text-white">✕</button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-8 py-6">
          {error && <p className="text-rose-300">{error}</p>}
          {!docs && !error && (
            <div className="space-y-3 pt-10 text-muted">
              {["İndeks okunuyor", "Klasör diyagramı çiziliyor", "Groq CLAUDE.md yazıyor"].map((l, i) => (
                <motion.div key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.5 }} className="flex items-center gap-3">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />{l}…
                </motion.div>
              ))}
            </div>
          )}
          {docs && <Md src={text} />}
        </div>
      </motion.div>
    </div>
  );
}
