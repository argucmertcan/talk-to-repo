"use client";
import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { FileTree } from "@/components/FileTree";
import { CodeView } from "@/components/CodeView";
import { RepoMap } from "@/components/RepoMap";
import { indexRepo } from "@/lib/indexer";
import { AnimatePresence, motion } from "framer-motion";
import { loadZip } from "@/lib/loader";
import type { Repo } from "@/lib/types";

export default function Home() {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<string | null>(null);

  async function onZip(data: ArrayBuffer, name: string) {
    if (!data.byteLength) return setError(name);
    setBusy(true);
    setError(undefined);
    try {
      const r = await loadZip(data, name);
      setRepo(r);
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const file = useMemo(() => repo?.files.find((f) => f.path === selected) ?? null, [repo, selected]);
  const index = useMemo(() => (repo ? indexRepo(repo) : null), [repo]);
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
      {repo && index ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-64 shrink-0 border-r border-line bg-panel">
            <FileTree files={repo.files} selected={selected} onSelect={setSelected} />
          </aside>
          <section className="relative min-w-0 flex-1">
            <RepoMap index={index} selected={selected} onSelect={setSelected} />
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
                  <div className="min-h-0 flex-1"><CodeView file={file} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      ) : (
        <Loader onZip={onZip} busy={busy} error={error} />
      )}
    </main>
  );
}
