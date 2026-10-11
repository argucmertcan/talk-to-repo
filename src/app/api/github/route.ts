import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/guard";

const MAX_ZIP = Number(process.env.MAX_REPO_ZIP_MB ?? 50) * 1024 * 1024;

// Public GitHub reposunun zip'ini sunucudan çeker (tarayıcıdan doğrudan çekmek CORS'a takılır).
// Zip akış hâlinde okunur; sınırı aşan repo belleği doldurmadan kesilir.
export async function GET(req: Request) {
  const limited = rateLimit(req, "github");
  if (limited) return limited;
  const url = new URL(req.url).searchParams.get("url") ?? "";
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/);
  if (!m) return NextResponse.json({ error: "Geçerli bir GitHub reposu adresi değil" }, { status: 400 });
  const [, owner, repo] = m;
  for (const branch of ["main", "master"]) {
    const abort = new AbortController();
    const res = await fetch(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`, { signal: abort.signal });
    if (!res.ok || !res.body) continue;
    const tooBig = () => NextResponse.json({ error: `Repo çok büyük (en fazla ${MAX_ZIP / 1024 / 1024} MB zip).` }, { status: 413 });
    if (Number(res.headers.get("content-length") ?? 0) > MAX_ZIP) {
      abort.abort();
      return tooBig();
    }
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ZIP) {
        abort.abort(); // indirmeyi keser; reader.cancel() beklemek takılıyordu
        return tooBig();
      }
      chunks.push(value);
    }
    return new NextResponse(Buffer.concat(chunks), {
      headers: { "content-type": "application/zip", "x-repo-name": repo },
    });
  }
  return NextResponse.json({ error: "Repo bulunamadı ya da gizli" }, { status: 404 });
}
