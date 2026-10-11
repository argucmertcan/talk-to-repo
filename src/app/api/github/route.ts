import { NextResponse } from "next/server";

// Public GitHub reposunun zip'ini sunucudan çeker (tarayıcıdan doğrudan çekmek CORS'a takılır).
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") ?? "";
  const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/|$)/);
  if (!m) return NextResponse.json({ error: "Geçerli bir GitHub reposu adresi değil" }, { status: 400 });
  const [, owner, repo] = m;
  for (const branch of ["main", "master"]) {
    const res = await fetch(`https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`);
    if (res.ok) {
      return new NextResponse(await res.arrayBuffer(), {
        headers: { "content-type": "application/zip", "x-repo-name": repo },
      });
    }
  }
  return NextResponse.json({ error: "Repo bulunamadı ya da gizli" }, { status: 404 });
}
