// Geliştirme aracı: soruları uçtan uca dener (plan → parçalar → alıntılı cevap).
import { readFileSync } from "node:fs";
import { loadZip } from "../src/lib/loader";
import { indexRepo } from "../src/lib/indexer";
import { analyze } from "../src/lib/analyze";
import { ask, type Turn } from "../src/lib/assistant";

(async () => {
  const buf = readFileSync("public/demo/kargo-api.zip");
  const repo = await loadZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, "kargo-api");
  const index = indexRepo(repo);
  const analysis = analyze(repo, index);
  const history: Turn[] = [];
  for (const question of process.argv.slice(2)) {
    const a = await ask({ base: process.env.BASE ?? "http://localhost:3220", question, repo, index, analysis, history });
    console.log(`\n>>> ${question}  (${a.ms} ms${a.retried ? ", DÜZELTİLDİ" : ""}) kind=${a.plan.kind}`);
    console.log("   yol:", a.plan.path.map((p) => p.split("/").pop()).join(" → "));
    console.log("   odak:", a.plan.focus.map((p) => p.split("/").pop()).join(", "));
    console.log("   okunan:", a.snippets.map((s) => `${s.path.split("/").pop()}:${s.start}-${s.end}`).join(", "));
    console.log("   CEVAP:", a.answer.slice(0, 600));
    console.log("   alıntı:", a.citations.map((c) => `${c.path.split("/").pop()}:${c.start}-${c.end}`).join(", "));
    history.push({ role: "user", content: question }, { role: "assistant", content: a.answer });
  }
})();
