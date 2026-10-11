// CLAUDE.md / ARCHITECTURE.md için kodla hesaplanan parçalar (diyagram, sayılar)
import type { RepoIndex } from "./indexer";
import type { Repo } from "./types";
import type { Analysis } from "./analyze";

/** Klasör (grup) düzeyinde bağımlılık diyagramı — Mermaid */
export function mermaidOf(index: RepoIndex) {
  const count = new Map<string, number>();
  for (const e of index.edges) {
    const a = index.byPath.get(e.from)!.group, b = index.byPath.get(e.to)!.group;
    if (a !== b) count.set(`${a}|${b}`, (count.get(`${a}|${b}`) ?? 0) + 1);
  }
  const id = (g: string) => g.replace(/[^\w]/g, "_");
  const lines = [...count.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => {
    const [a, b] = k.split("|");
    return `  ${id(a)}[${a}] -->|${n}| ${id(b)}[${b}]`;
  });
  return "```mermaid\ngraph LR\n" + lines.join("\n") + "\n```";
}

/** package.json'lardan script ve bağımlılıklar — yapay zekâ komut/kütüphane uydurmasın diye kodla çıkarılır */
export function packageFacts(repo: Repo) {
  return repo.files.filter((f) => f.path.endsWith("package.json")).map((f) => {
    try {
      const p = JSON.parse(f.content);
      return { dosya: f.path, scripts: p.scripts ?? {}, bagimliliklar: Object.keys({ ...p.dependencies, ...p.devDependencies }) };
    } catch { return { dosya: f.path, scripts: {}, bagimliliklar: [] }; }
  });
}

export function docFacts(repo: Repo, index: RepoIndex, analysis: Analysis) {
  const groups = new Map<string, { files: number; lines: number }>();
  for (const f of index.files) {
    const g = groups.get(f.group) ?? { files: 0, lines: 0 };
    g.files++; g.lines += f.lines;
    groups.set(f.group, g);
  }
  return {
    stats: analysis.stats,
    paketler: packageFacts(repo),
    klasorler: [...groups.entries()].map(([g, v]) => `${g}: ${v.files} dosya, ${v.lines} satır`),
    routes: index.files.flatMap((f) => f.routes.map((r) => `${r.method} ${r.fullPath} [${r.middlewares.join(",") || "korumasız"}] → ${f.path}:${r.line}`)),
    bulgular: analysis.findings.map((f) => `[${f.severity}] ${f.fact}`),
  };
}
