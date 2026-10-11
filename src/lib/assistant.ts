// Bir sorunun uçtan uca akışı: indeks → plan (Groq) → doğrula (gerekirse kendini düzelt) → parçaları getir → alıntılı cevap (Groq).
// Hem arayüz hem terminal test aracı bunu kullanır.
import type { Repo } from "./types";
import type { RepoIndex } from "./indexer";
import type { Analysis } from "./analyze";

export interface Plan {
  reply: string;
  kind: "flow" | "locate" | "explain" | "chat";
  focus: string[];
  path: string[];
  read: { path: string; symbol: string | null }[];
}
export interface Citation { path: string; start: number; end: number }
export interface Snippet { path: string; start: number; end: number; text: string }
export interface Turn { role: "user" | "assistant"; content: string }
export interface Answer {
  plan: Plan;
  answer: string;
  citations: Citation[];
  snippets: Snippet[];
  ms: number;
  retried: boolean;
}

const MAX_SNIPPET = 70;

/** Yapay zekâya giden indeks: dosya yolları, satır sayıları, export'lar, route'lar, import'lar. Kodun kendisi YOK. */
export function buildIndexContext(repo: Repo, index: RepoIndex, analysis: Analysis) {
  return {
    repo: repo.name,
    dosyalar: index.files.slice(0, 400).map((f) => {
      const parts = [`${f.path} (${f.lines})`];
      if (f.exports.length) parts.push(`export: ${f.exports.map((e) => e.name).slice(0, 12).join(",")}`);
      if (f.routes.length) parts.push(`route: ${f.routes.map((r) => `${r.method} ${r.fullPath}${r.middlewares.length ? ` [${r.middlewares.join(",")}]` : " []"}`).join("; ")}`);
      const imps = f.imports.filter((i) => i.target).map((i) => i.target!.split("/").pop());
      if (imps.length) parts.push(`import: ${imps.join(",")}`);
      return parts.join(" | ");
    }),
    diger_dosyalar: repo.files.filter((f) => !index.byPath.has(f.path)).map((f) => f.path).slice(0, 60),
    bulgular: analysis.findings.map((f) => f.fact),
  };
}

/** Bilinmeyen yolları dosya adına göre onar; onarılamayanları hata olarak döndür */
function validatePlan(plan: Plan, repo: Repo): { plan: Plan; errors: string[] } {
  const paths = new Set(repo.files.map((f) => f.path));
  const errors: string[] = [];
  const fix = (p: string) => {
    if (paths.has(p)) return p;
    const base = p.split("/").pop();
    const cands = repo.files.filter((f) => f.path.endsWith("/" + base) || f.path === base);
    if (cands.length === 1) return cands[0].path;
    errors.push(`Böyle bir dosya yok: ${p}`);
    return null;
  };
  const clean = (arr: string[]) => [...new Set(arr.map(fix).filter((p): p is string => !!p))];
  const read = plan.read.map((r) => ({ ...r, path: fix(r.path) })).filter((r): r is { path: string; symbol: string | null } => !!r.path).slice(0, 6);
  return { plan: { ...plan, focus: clean(plan.focus), path: clean(plan.path), read }, errors };
}

/** Plandaki okumaları motor yapar: sembol varsa onun satırları, yoksa dosyanın başı */
export function fetchSnippets(plan: Plan, repo: Repo, index: RepoIndex): Snippet[] {
  return plan.read.map((r) => {
    const file = repo.files.find((f) => f.path === r.path)!;
    const lines = file.content.split("\n");
    const sym = r.symbol ? index.byPath.get(r.path)?.symbols.find((s) => s.name === r.symbol) : undefined;
    const route = r.symbol ? index.byPath.get(r.path)?.routes.find((x) => x.handler.includes(r.symbol!) || x.fullPath === r.symbol) : undefined;
    let start = 1, end = Math.min(lines.length, MAX_SNIPPET);
    if (sym) { start = sym.line; end = Math.min(sym.end, sym.line + MAX_SNIPPET - 1); }
    else if (route) { start = Math.max(1, route.line - 3); end = Math.min(lines.length, route.line + 3); }
    const text = lines.slice(start - 1, end).map((l, i) => `${start + i}| ${l}`).join("\n");
    return { path: r.path, start, end, text };
  });
}

export async function ask(opts: {
  base: string; question: string; repo: Repo; index: RepoIndex; analysis: Analysis; history: Turn[];
}): Promise<Answer> {
  const { base, question, repo, index, analysis, history } = opts;
  const post = (p: string, body: object) =>
    fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
  const context = buildIndexContext(repo, index, analysis);

  let res = await post("/api/plan", { question, context, history });
  if (res.error) throw new Error(res.error);
  let ms = res.ms as number;
  const first = validatePlan(res.plan as Plan, repo);
  let plan = first.plan;
  const errors = first.errors;
  let retried = false;
  if (errors.length || (plan.kind !== "chat" && plan.read.length === 0)) {
    retried = true;
    const why = errors.length ? errors.join("; ") : "okunacak dosya (read) boş";
    res = await post("/api/plan", { question: `HATA: önceki plan geçersiz (${why}). Sadece indeksteki yolları birebir kullanarak "${question}" için planı yeniden üret.`, context, history });
    if (res.error) throw new Error(res.error);
    ms += res.ms;
    ({ plan } = validatePlan(res.plan as Plan, repo));
  }

  const snippets = fetchSnippets(plan, repo, index);
  if (plan.kind === "chat" || !snippets.length) return { plan, answer: plan.reply, citations: [], snippets, ms, retried };

  const ans = await post("/api/answer", { question, snippets: snippets.map((s) => ({ dosya: s.path, satirlar: `${s.start}-${s.end}`, kod: s.text })), history });
  if (ans.error) throw new Error(ans.error);
  ms += ans.ms;
  // Alıntıları doğrula: sadece getirilen parçaların içindeki satırlar geçerli
  const citations = (ans.citations as Citation[]).filter((c) =>
    snippets.some((s) => s.path === c.path && c.start >= s.start && c.end <= s.end && c.start <= c.end));
  return { plan, answer: ans.answer, citations, snippets, ms, retried };
}
