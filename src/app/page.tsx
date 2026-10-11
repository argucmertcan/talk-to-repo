"use client";
import { useMemo, useState } from "react";
import { Loader } from "@/components/Loader";
import { FileTree } from "@/components/FileTree";
import { CodeView } from "@/components/CodeView";
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
      setSelected(r.files.find((f) => /readme/i.test(f.path))?.path ?? r.files[0]?.path ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const file = useMemo(() => repo?.files.find((f) => f.path === selected) ?? null, [repo, selected]);
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
      {repo ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-72 shrink-0 border-r border-line bg-panel">
            <FileTree files={repo.files} selected={selected} onSelect={setSelected} />
          </aside>
          <section className="min-w-0 flex-1">
            {file && (
              <div className="flex h-full flex-col">
                <div className="border-b border-line bg-panel px-4 py-2 font-mono text-xs text-muted">{file.path} · {file.lines} satır</div>
                <div className="min-h-0 flex-1"><CodeView file={file} /></div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <Loader onZip={onZip} busy={busy} error={error} />
      )}
    </main>
  );
}
