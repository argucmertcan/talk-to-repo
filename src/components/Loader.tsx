"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

export function Loader({ onZip, busy, error }: { onZip: (data: ArrayBuffer, name: string) => void; busy: boolean; error?: string }) {
  const [url, setUrl] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function fromGithub() {
    const res = await fetch(`/api/github?url=${encodeURIComponent(url)}`);
    if (!res.ok) return onZip(new ArrayBuffer(0), (await res.json()).error ?? "hata");
    onZip(await res.arrayBuffer(), res.headers.get("x-repo-name") ?? "repo");
  }
  async function demo() {
    const res = await fetch("/demo/kargo-api.zip");
    onZip(await res.arrayBuffer(), "kargo-api");
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-4xl font-bold">Kod tabanınla konuş</h1>
        <p className="mb-8 text-center text-muted">Bir repo ver; haritasını çizeyim, sorunlarını bulayım, sorularını dosya:satır alıntılı cevaplayayım.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (url.trim()) fromGithub(); }}
          className="flex gap-2 rounded-2xl border border-line bg-panel p-2 focus-within:border-accent/70"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/kullanici/repo"
            className="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:text-muted"
          />
          <button disabled={busy} className="rounded-xl bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-50">
            {busy ? "Açılıyor…" : "Yükle"}
          </button>
        </form>
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={async (e) => {
            e.preventDefault(); setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onZip(await f.arrayBuffer(), f.name.replace(/\.zip$/, ""));
          }}
          onClick={() => input.current?.click()}
          className={`mt-4 cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center text-sm transition ${over ? "border-accent bg-accent/10" : "border-line text-muted hover:border-accent/50"}`}
        >
          ya da bir <b>.zip</b> sürükle
          <input ref={input} type="file" accept=".zip" className="hidden"
            onChange={async (e) => { const f = e.target.files?.[0]; if (f) onZip(await f.arrayBuffer(), f.name.replace(/\.zip$/, "")); }} />
        </div>
        <button onClick={demo} className="mx-auto mt-4 block text-sm text-muted underline-offset-4 hover:text-white hover:underline">
          veya örnek repoyla dene (kargo-api)
        </button>
        {error && <p className="mt-4 text-center text-sm text-rose-300">{error}</p>}
      </motion.div>
    </div>
  );
}
