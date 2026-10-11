// Kod indeksi: yapay zekânın göreceği tek şey bu (kodun kendisi değil).
// Import grafiği, export'lar, route'lar ve semboller düz regex ile çıkarılır; dil sunucusu gerekmez.
import type { Repo, RepoFile } from "./types";

export const CODE_EXT = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs"]);

export interface ImportRef { spec: string; target: string | null; line: number; names: string[] }
export interface ExportRef { name: string; line: number; kind: string }
export interface RouteRef { method: string; path: string; fullPath: string; middlewares: string[]; handler: string; line: number; router: string }
export interface SymbolRef { name: string; line: number; end: number }

export interface FileIndex {
  path: string;
  lines: number;
  group: string;
  imports: ImportRef[];
  exports: ExportRef[];
  routes: RouteRef[];
  symbols: SymbolRef[];
}

export interface RepoIndex {
  files: FileIndex[];
  byPath: Map<string, FileIndex>;
  edges: { from: string; to: string }[];
  fanIn: Map<string, number>;
}

const IMPORT_RE = /(?:import\s+(?:type\s+)?([\s\S]*?)\s+from\s+|import\s+|export\s+(?:\*|\{[^}]*\})\s+from\s+|require\(\s*|import\(\s*)["'`]([^"'`]+)["'`]/g;
const EXPORT_RE = /^export\s+(?:default\s+)?(?:async\s+)?(function|const|let|class|interface|type|enum)\s+(\w+)/;
const ROUTE_RE = /\b(\w+)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]\s*,([^;]*)\)\s*;?/;
const MOUNT_RE = /\.use\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\w+)\s*\)/g;
const SYMBOL_RE = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\(|function|\w+\s*=>)|class\s+(\w+))/;

/** Dosyanın "grubu": haritada renk ve kümeleme için (src/controllers → controllers) */
export function groupOf(path: string) {
  const parts = path.split("/");
  if (parts[0] === "src" && parts.length > 2) return parts[1];
  if (parts.length > 2 && parts[1] === "src") return parts[0];
  return parts.length > 1 ? parts[0] : "kök";
}

function resolve(from: string, spec: string, paths: Set<string>): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) {
    const dir = from.split("/").slice(0, -1);
    for (const part of spec.split("/")) {
      if (part === "..") dir.pop();
      else if (part !== ".") dir.push(part);
    }
    base = dir.join("/");
  } else return null; // paket importu
  for (const cand of [base, ...["ts", "tsx", "js", "jsx", "mjs"].map((e) => `${base}.${e}`), ...["ts", "tsx", "js"].map((e) => `${base}/index.${e}`)]) {
    if (paths.has(cand)) return cand;
  }
  return null;
}

const lineAt = (content: string, idx: number) => content.slice(0, idx).split("\n").length;

export function indexRepo(repo: Repo): RepoIndex {
  const code = repo.files.filter((f) => CODE_EXT.has(f.ext));
  const paths = new Set(code.map((f) => f.path));
  const files: FileIndex[] = code.map((f) => indexFile(f, paths));

  // app.use("/admin", adminRouter) → route'ların tam yolu
  const mounts = new Map<string, string>();
  for (const f of code) {
    for (const m of f.content.matchAll(MOUNT_RE)) mounts.set(m[2], m[1]);
  }
  for (const fi of files) {
    for (const r of fi.routes) {
      const prefix = mounts.get(r.router) ?? "";
      r.fullPath = (prefix + (r.path === "/" ? "" : r.path)) || "/";
    }
  }

  const edges = files.flatMap((fi) => fi.imports.filter((i) => i.target).map((i) => ({ from: fi.path, to: i.target! })));
  const fanIn = new Map<string, number>();
  for (const e of edges) fanIn.set(e.to, (fanIn.get(e.to) ?? 0) + 1);
  return { files, byPath: new Map(files.map((f) => [f.path, f])), edges, fanIn };
}

function indexFile(f: RepoFile, paths: Set<string>): FileIndex {
  const imports: ImportRef[] = [];
  for (const m of f.content.matchAll(IMPORT_RE)) {
    const names = (m[1] ?? "").replace(/[{}*]/g, " ").split(/[\s,]+/).filter((n) => n && n !== "as" && n !== "type");
    imports.push({ spec: m[2], target: resolve(f.path, m[2], paths), line: lineAt(f.content, m.index ?? 0), names });
  }
  const lines = f.content.split("\n");
  const exports: ExportRef[] = [];
  const routes: RouteRef[] = [];
  const starts: { name: string; line: number }[] = [];
  lines.forEach((l, i) => {
    const e = l.match(EXPORT_RE);
    if (e) exports.push({ name: e[2], line: i + 1, kind: e[1] });
    const r = l.match(ROUTE_RE);
    if (r) {
      const args = r[4].split(",").map((s) => s.trim()).filter(Boolean);
      routes.push({
        router: r[1], method: r[2].toUpperCase(), path: r[3], fullPath: r[3],
        middlewares: args.slice(0, -1).map((a) => a.replace(/\(.*$/, "")), handler: args.at(-1) ?? "", line: i + 1,
      });
    }
    const s = l.match(SYMBOL_RE);
    if (s) starts.push({ name: s[1] ?? s[2] ?? s[3], line: i + 1 });
  });
  const symbols = starts.map((s, k) => ({ ...s, end: (starts[k + 1]?.line ?? lines.length + 1) - 1 }));
  return { path: f.path, lines: f.lines, group: groupOf(f.path), imports, exports, routes, symbols };
}
