// Geliştirme aracı: demo reposunun indeksini terminalde gösterir.
import { readFileSync } from "node:fs";
import { loadZip } from "../src/lib/loader";
import { indexRepo } from "../src/lib/indexer";

(async () => {
  const buf = readFileSync(process.argv[2] ?? "public/demo/kargo-api.zip");
  const repo = await loadZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, "repo");
  const idx = indexRepo(repo);
  console.log(`${idx.files.length} kod dosyası, ${idx.edges.length} import kenarı`);
  const unresolved = idx.files.flatMap((f) => f.imports.filter((i) => !i.target && i.spec.startsWith(".")).map((i) => `${f.path} → ${i.spec}`));
  console.log("çözülemeyen göreli import:", unresolved.length, unresolved.slice(0, 5));
  console.log("route'lar:");
  for (const f of idx.files) for (const r of f.routes) console.log(`  ${r.method} ${r.fullPath}  [${r.middlewares.join(", ")}]  ${f.path}:${r.line}`);
  const top = [...idx.fanIn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("en çok import edilen:", top);
  console.log("passwordReset sembolleri:", idx.byPath.get("src/services/passwordReset.service.ts")?.symbols);
})();
