// Geliştirme aracı: CLAUDE.md üretimini dener ve uydurma komut/kütüphane var mı bakar.
import { readFileSync } from "node:fs";
import { loadZip } from "../src/lib/loader";
import { indexRepo } from "../src/lib/indexer";
import { analyze } from "../src/lib/analyze";
import { buildIndexContext } from "../src/lib/assistant";
import { docFacts } from "../src/lib/docs";

(async () => {
  const buf = readFileSync("public/demo/kargo-api.zip");
  const repo = await loadZip(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, "kargo-api");
  const index = indexRepo(repo), analysis = analyze(repo, index);
  for (let i = 0; i < Number(process.argv[2] ?? 2); i++) {
    const res = await fetch(`${process.env.BASE ?? "http://localhost:3220"}/api/claudemd`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: buildIndexContext(repo, index, analysis), facts: docFacts(repo, index, analysis) }),
    }).then((r) => r.json());
    const md: string = res.claudeMd ?? res.error;
    const bad = ["Joi", "Yup", "vite", "npm start", "prisma", "mongoose", "jest.config", "Docker"].filter((w) => new RegExp(`\\b${w}\\b`, "i").test(md));
    console.log(`#${i + 1} ${res.ms} ms · uydurma şüphesi: ${bad.join(", ") || "yok"} · zod geçiyor: ${/zod/i.test(md)}`);
    console.log(md.split("\n").filter((l) => /joi|yup|vite|npm start/i.test(l)).join("\n"));
  }
})();
