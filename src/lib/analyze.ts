// Statik analiz: bulguları KOD hesaplar (dosya, satır, sayı). Yapay zekâ sadece bunları cümleye döker.
import type { Repo } from "./types";
import type { RepoIndex } from "./indexer";

export type Severity = "high" | "medium" | "low" | "info";
export type FindingKind = "unprotected-route" | "secret" | "cycle" | "dead" | "god-file" | "n-plus-one" | "hub";

export interface Finding {
  id: string;
  kind: FindingKind;
  severity: Severity;
  files: string[];
  line?: number;
  fact: string; // yapay zekâya giden, sayılarla dolu tek cümle
}

export interface Analysis {
  stats: { files: number; codeFiles: number; lines: number; edges: number; routes: number };
  findings: Finding[];
}

export const SEVERITY_COLOR: Record<Severity, string> = { high: "#ff4d5e", medium: "#ff8c3a", low: "#94a3b8", info: "#38bdf8" };

const AUTH_MW = /auth|admin|protect|guard|verify|session|jwt/i;
const SECRET_RES = [
  /\b(?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*["'`]([A-Za-z0-9_\-]{20,})["'`]/i,
  /["'`]((?:sk|pk|rk|kl)_(?:live|test)_[A-Za-z0-9]{16,})["'`]/,
  /["'`](AKIA[0-9A-Z]{16})["'`]/,
];
const TEST = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[jt]sx?$/;
const DB_CALL = /await\s+[\w.]*\.(find\w*|query|select|get\w*ById|findMany|findOne|fetch)\(/;

export function analyze(repo: Repo, index: RepoIndex): Analysis {
  const findings: Finding[] = [];
  const add = (f: Omit<Finding, "id">) => findings.push({ ...f, id: `${f.kind}-${findings.length + 1}` });

  // 1) Korumasız route: aynı router'daki route'ların çoğu korumalıyken bu değilse ya da /admin altındaysa
  for (const fi of index.files) {
    if (!fi.routes.length || TEST.test(fi.path)) continue;
    const guarded = fi.routes.filter((r) => r.middlewares.some((m) => AUTH_MW.test(m)));
    for (const r of fi.routes) {
      const isGuarded = r.middlewares.some((m) => AUTH_MW.test(m));
      const siblingsGuarded = guarded.length / fi.routes.length >= 0.5;
      if (!isGuarded && (siblingsGuarded || /^\/admin\b/.test(r.fullPath))) {
        add({ kind: "unprotected-route", severity: "high", files: [fi.path], line: r.line,
          fact: `${r.method} ${r.fullPath} route'unda yetki kontrolü yok (${fi.path}:${r.line}); aynı dosyadaki ${guarded.length}/${fi.routes.length} route korumalı. Handler: ${r.handler}.` });
      }
    }
  }

  // 2) Kodda sabit yazılmış anahtar
  for (const f of repo.files) {
    if (/\.example$|\.md$/.test(f.path) || /(^|\/)tests?\//.test(f.path)) continue;
    f.content.split("\n").forEach((l, i) => {
      if (SECRET_RES.some((re) => re.test(l))) {
        add({ kind: "secret", severity: "high", files: [f.path], line: i + 1,
          fact: `${f.path}:${i + 1} satırında koda gömülü bir anahtar/sır deseni var (env yerine kaynak kodda).` });
      }
    });
  }

  // 3) Döngüsel bağımlılık (Tarjan SCC)
  const adj = new Map<string, string[]>();
  for (const e of index.edges) adj.set(e.from, [...(adj.get(e.from) ?? []), e.to]);
  let idx = 0;
  const stack: string[] = [], on = new Set<string>(), ids = new Map<string, number>(), low = new Map<string, number>();
  const sccs: string[][] = [];
  const strong = (v: string) => {
    ids.set(v, idx); low.set(v, idx); idx++; stack.push(v); on.add(v);
    for (const w of adj.get(v) ?? []) {
      if (!ids.has(w)) { strong(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (on.has(w)) low.set(v, Math.min(low.get(v)!, ids.get(w)!));
    }
    if (low.get(v) === ids.get(v)) {
      const comp: string[] = [];
      let w: string;
      do { w = stack.pop()!; on.delete(w); comp.push(w); } while (w !== v);
      if (comp.length > 1) sccs.push(comp);
    }
  };
  for (const f of index.files) if (!ids.has(f.path)) strong(f.path);
  for (const c of sccs) {
    add({ kind: "cycle", severity: "medium", files: c,
      fact: `Döngüsel bağımlılık: ${c.join(" ↔ ")} birbirini import ediyor (${c.length} dosya).` });
  }

  // 4) Ölü dosya: hiçbir yerden import edilmiyor ve giriş noktası değil
  const ENTRY = /(^|\/)(server|main|index|app|App)\.(t|j)sx?$|(^|\/)tests?\/|\.(test|spec)\.|\.config\./;
  for (const fi of index.files) {
    const content = repo.files.find((f) => f.path === fi.path)!.content;
    if ((index.fanIn.get(fi.path) ?? 0) === 0 && !ENTRY.test(fi.path) && !/listen\(|createRoot\(/.test(content)) {
      add({ kind: "dead", severity: "low", files: [fi.path],
        fact: `${fi.path} (${fi.lines} satır) hiçbir dosyadan import edilmiyor; ölü kod olabilir. Export'ları: ${fi.exports.map((e) => e.name).join(", ") || "yok"}.` });
    }
  }

  // 5) God file: medyanın 8 katından ve 400 satırdan büyük
  // Test dosyaları uzun olabilir; sorumluluk dağınıklığı sayılmaz (gerçek bir repoda test.js'i god file sanıyordu)
  const prod = index.files.filter((f) => !TEST.test(f.path));
  const sizes = prod.map((f) => f.lines).sort((a, b) => a - b);
  const median = sizes[Math.floor(sizes.length / 2)] || 1;
  for (const fi of prod) {
    if (fi.lines > 400 && fi.lines > median * 8) {
      add({ kind: "god-file", severity: "medium", files: [fi.path],
        fact: `${fi.path} ${fi.lines} satır (repodaki dosyaların ortanca boyu ${median} satır), ${fi.exports.length} export içeriyor; tek dosyada çok fazla sorumluluk.` });
    }
  }

  // 6) N+1: döngü içinde await'li veritabanı çağrısı
  for (const fi of index.files) {
    const lines = repo.files.find((f) => f.path === fi.path)!.content.split("\n");
    lines.forEach((l, i) => {
      if (!/\bfor\s*\(|\.forEach\(|\.map\(\s*async/.test(l)) return;
      for (let k = i + 1; k < Math.min(lines.length, i + 7); k++) {
        if (DB_CALL.test(lines[k])) {
          add({ kind: "n-plus-one", severity: "medium", files: [fi.path], line: k + 1,
            fact: `${fi.path}:${k + 1} döngü içinde her eleman için ayrı veritabanı sorgusu yapıyor (N+1): "${lines[k].trim().slice(0, 80)}".` });
          break;
        }
      }
    });
  }

  // 7) En çok bağımlılık alan dosyalar (bilgi)
  const hubs = [...index.fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (hubs.length) {
    add({ kind: "hub", severity: "info", files: hubs.map(([p]) => p),
      fact: `En çok import edilen dosyalar: ${hubs.map(([p, n]) => `${p} (${n})`).join(", ")}; buralardaki değişiklik geniş etki yaratır.` });
  }

  return {
    stats: {
      files: repo.files.length,
      codeFiles: index.files.length,
      lines: repo.files.reduce((s, f) => s + f.lines, 0),
      edges: index.edges.length,
      routes: index.files.filter((f) => !TEST.test(f.path)).reduce((s, f) => s + f.routes.length, 0),
    },
    findings,
  };
}
