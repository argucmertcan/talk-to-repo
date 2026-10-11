"use client";
import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { FileTree } from "@/components/FileTree";
import { CodeView } from "@/components/CodeView";
import { RepoMap } from "@/components/RepoMap";
import { indexRepo } from "@/lib/indexer";
import { analyze, SEVERITY_COLOR, type Finding } from "@/lib/analyze";
import { AnalysisPanel, type InsightState } from "@/components/AnalysisPanel";
import { ChatPanel, type ChatMsg } from "@/components/ChatPanel";
import { ask, type Citation, type Turn } from "@/lib/assistant";
import { AnimatePresence, motion } from "framer-motion";
import { loadZip } from "@/lib/loader";
import type { Repo } from "@/lib/types";

export default function Home() {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<string | null>(null);
  const [hl, setHl] = useState<[number, number] | null>(null);
  const [insights, setInsights] = useState<InsightState>({});
  const [tab, setTab] = useState<"analiz" | "sohbet">("analiz");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [history, setHistory] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const [trail, setTrail] = useState<string[]>([]);

  async function onZip(data: ArrayBuffer, name: string) {
    if (!data.byteLength) return setError(name);
    setBusy(true);
    setError(undefined);
    try {
      const r = await loadZip(data, name);
      setRepo(r);
      setSelected(null);
      setInsights({});
      setMessages([]); setHistory([]); setFocus(new Set()); setTrail([]); setTab("analiz");
      const ix = indexRepo(r);
      const a = analyze(r, ix);
      fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: r.name, stats: a.stats, findings: a.findings, files: r.files.map((f) => f.path) }),
      })
        .then((res) => res.json())
        .then((d) => setInsights(d.error ? { error: d.error } : d))
        .catch((e) => setInsights({ error: String(e) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const file = useMemo(() => repo?.files.find((f) => f.path === selected) ?? null, [repo, selected]);
  const index = useMemo(() => (repo ? indexRepo(repo) : null), [repo]);
  const analysis = useMemo(() => (repo && index ? analyze(repo, index) : null), [repo, index]);
  const marks = useMemo(() => {
    const m = new Map<string, string>();
    const rank = { high: 3, medium: 2, low: 1, info: 0 };
    for (const f of [...(analysis?.findings ?? [])].filter((f) => f.severity !== "info").sort((a, b) => rank[a.severity] - rank[b.severity]))
      for (const p of f.files) m.set(p, SEVERITY_COLOR[f.severity]);
    return m;
  }, [analysis]);

  function pick(f: Finding) {
    setSelected(f.files[0]);
    setHl(f.line ? [f.line, f.line] : null);
  }

  async function send(q: string) {
    if (!repo || !index || !analysis) return;
    setTab("sohbet");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setThinking(true);
    try {
      const a = await ask({ base: "", question: q, repo, index, analysis, history });
      setFocus(new Set([...a.plan.focus, ...a.plan.path]));
      setTrail(a.plan.path);
      setSelected(null);
      setMessages((m) => [...m, { role: "assistant", text: a.plan.reply, answer: a.answer, path: a.plan.path, citations: a.citations, ms: a.ms }]);
      setHistory((h) => [...h, { role: "user", content: q }, { role: "assistant", content: a.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: (e as Error).message, error: true }]);
    } finally {
      setThinking(false);
    }
  }

  function cite(c: Citation) {
    const p = repo?.files.find((f) => f.path === c.path || f.path.endsWith("/" + c.path))?.path;
    if (p) { setSelected(p); setHl([c.start, c.end]); }
  }

  const loc = useMemo(() => repo?.files.reduce((s, f) => s + f.lines, 0) ?? 0, [repo]);

  return (
    <main className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-accent font-mono text-sm font-bold text-accent">&gt;_</span>
        <span className="text-lg font-semibold">Talk to Repo</span>
        {repo && (
          <>
            <span className="text-muted">/</span>
            <span className="font-mono text-sm">{repo.name}</span>
            <span className="ml-auto text-sm text-muted">{repo.files.length} dosya · {loc.toLocaleString("tr-TR")} satır</span>
          </>
        )}
      </header>
      {repo && index && analysis ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 border-r border-line bg-panel">
            <FileTree files={repo.files} selected={selected} onSelect={(p) => { setSelected(p); setHl(null); }} marks={marks} />
          </aside>
          <section className="relative min-w-0 flex-1">
            <RepoMap index={index} selected={selected} onSelect={(p) => { setSelected(p); setHl(null); }} marks={marks} focus={focus} trail={trail} />
            <AnimatePresence>
              {file && (
                <motion.div
                  key="code"
                  initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
                  className="absolute bottom-3 right-3 top-3 flex w-[46%] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl"
                >
                  <div className="flex items-center border-b border-line px-4 py-2 font-mono text-xs text-muted">
                    <span className="truncate">{file.path} · {file.lines} satır</span>
                    <button onClick={() => setSelected(null)} className="ml-auto pl-3 hover:text-white">✕</button>
                  </div>
                  <div className="min-h-0 flex-1"><CodeView file={file} highlight={hl} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          <aside className="flex w-[400px] shrink-0 flex-col border-l border-line bg-panel p-4">
            <div className="mb-3 flex gap-1 rounded-xl bg-ink p-1">
              {(["analiz", "sohbet"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg py-1.5 text-sm ${tab === t ? "bg-panel-2 font-semibold text-white" : "text-muted"}`}>
                  {t === "analiz" ? "Analiz" : "Sohbet"}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              {tab === "analiz" ? (
                <div className="scroll-thin h-full overflow-y-auto pr-1">
                  <AnalysisPanel analysis={analysis} state={insights} onPick={pick} onAsk={send} />
                </div>
              ) : (
                <ChatPanel messages={messages} busy={thinking} onSend={send} onCite={cite} onStep={(p) => { setSelected(p); setHl(null); }} />
              )}
            </div>
          </aside>
        </div>
      ) : (
        <Loader onZip={onZip} busy={busy} error={error} />
      )}
    </main>
  );
}
