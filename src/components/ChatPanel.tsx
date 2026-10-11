"use client";
import { useEffect, useRef, useState } from "react";
import type { Citation } from "@/lib/assistant";

export interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  answer?: string;
  path?: string[];
  citations?: Citation[];
  ms?: number;
  error?: boolean;
  pending?: boolean;
}

const SUGGESTIONS = ["Şifre sıfırlama nasıl çalışıyor?", "/admin/export'u kim çağırabiliyor?", "Bir sipariş oluşturulunca neler oluyor?", "Fiyat nerede hesaplanıyor?"];
// [dosya:12-20] ya da (dosya:12-20) — model ikisini de yazabiliyor
const CITE = /[[(]([\w./@-]+\.\w+):(\d+)(?:-(\d+))?[\])]/g;

/** Cevaptaki [dosya:satır] etiketlerini tıklanabilir çiplere çevirir */
function AnswerText({ text, onCite }: { text: string; onCite: (c: Citation) => void }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CITE)) {
    parts.push(text.slice(last, m.index));
    const c = { path: m[1], start: Number(m[2]), end: Number(m[3] ?? m[2]) };
    parts.push(
      <button key={m.index} onClick={() => onCite(c)} className="mx-0.5 rounded bg-accent/15 px-1 font-mono text-[11px] text-accent-2 hover:bg-accent/30">
        {c.path.split("/").pop()}:{c.start}{c.end !== c.start ? `-${c.end}` : ""}
      </button>,
    );
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push(text.slice(last));
  return <p className="whitespace-pre-line leading-relaxed">{parts}</p>;
}

export function ChatPanel({ messages, busy, onSend, onCite, onStep }: {
  messages: ChatMsg[]; busy: boolean; onSend: (q: string) => void; onCite: (c: Citation) => void; onStep: (p: string) => void;
}) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);
  const send = (q: string) => { if (q.trim() && !busy) { onSend(q.trim()); setText(""); } };

  return (
    <div className="flex h-full flex-col">
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-muted">Repoya bir şey sor:</p>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="block w-full rounded-xl border border-line px-3 py-2 text-left text-sm hover:border-accent/60">{s}</button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-2xl rounded-br-md bg-accent px-3 py-2 text-sm font-medium text-ink">{m.text}</div>
          ) : (
            <div key={i} className={`mr-2 space-y-2 rounded-2xl rounded-bl-md border px-3 py-2.5 text-[13px] ${m.error ? "border-rose-500/40 text-rose-200" : "border-line bg-panel-2"}`}>
              <p className="text-muted">{m.text}</p>
              {m.path && m.path.length > 1 && (
                <div className="flex flex-wrap items-center gap-1">
                  {m.path.map((p, k) => (
                    <span key={p} className="flex items-center gap-1">
                      <button onClick={() => onStep(p)} className="rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] text-accent-2 hover:bg-accent/20">
                        <b className="text-accent">{k + 1}</b> {p.split("/").pop()}
                      </button>
                      {k < m.path!.length - 1 && <span className="text-muted">→</span>}
                    </span>
                  ))}
                </div>
              )}
              {m.answer && <AnswerText text={m.answer} onCite={onCite} />}
              {m.citations && m.citations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 border-t border-line pt-2">
                  <span className="mr-1 text-[11px] text-muted">Kaynaklar:</span>
                  {m.citations.map((c, k) => (
                    <button key={k} onClick={() => onCite(c)} className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[11px] text-accent-2 hover:bg-accent/30">
                      {c.path.split("/").pop()}:{c.start}{c.end !== c.start ? `-${c.end}` : ""}
                    </button>
                  ))}
                </div>
              )}
              {m.ms !== undefined && <div className="text-right font-mono text-[10px] text-muted">{(m.ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} sn</div>}
            </div>
          ),
        )}
        {busy && (
          <div className="mr-2 flex gap-1 rounded-2xl border border-line bg-panel-2 px-3 py-3">
            {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="mt-3 flex gap-2 rounded-2xl border border-line bg-ink p-2 focus-within:border-accent/70">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Repoya bir şey sor…"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted" />
        <button disabled={busy || !text.trim()} className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40">Sor</button>
      </form>
    </div>
  );
}
