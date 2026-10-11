import JSZip from "jszip";
import type { Repo, RepoFile } from "./types";

const TEXT_EXT = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "md", "sql", "css", "scss", "html", "yml", "yaml", "py", "go", "rs", "java", "kt", "rb", "php", "sh", "toml", "env", "example", "txt"]);
const SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor)\//;
const MAX_FILES = 2000;
const MAX_BYTES = 400_000;

/** Zip'i tarayıcıda açar; ikili dosyaları ve bağımlılık klasörlerini atlar. */
export async function loadZip(data: ArrayBuffer, fallbackName: string): Promise<Repo> {
  const zip = await JSZip.loadAsync(data);
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  // GitHub zip'leri tek bir kök klasörle gelir ("repo-main/…"); onu soy
  const roots = new Set(entries.map((e) => e.name.split("/")[0]));
  const strip = roots.size === 1 ? [...roots][0] + "/" : "";
  const files: RepoFile[] = [];
  for (const e of entries) {
    const path = e.name.slice(strip.length);
    const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
    if (!path || SKIP.test(path) || !TEXT_EXT.has(ext)) continue;
    const content = await e.async("string");
    if (content.length > MAX_BYTES) continue;
    // Dosya sonundaki "\n" fazladan boş satır sayılmasın (959 satırlık dosya 960 görünüyordu)
    const lines = content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
    files.push({ path, content, lines, ext });
    if (files.length >= MAX_FILES) break;
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  return { name: strip ? strip.slice(0, -1) : fallbackName, files };
}
