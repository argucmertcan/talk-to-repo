// Hafif sözdizimi renklendirme: yorum, metin, sayı, anahtar kelime
const RE = /(\/\/.*$|#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:import|from|export|const|let|var|function|return|if|else|for|of|in|await|async|new|class|interface|type|extends|throw|try|catch|default|switch|case)\b)/g;

export type Tok = { t: string; k: "c" | "s" | "n" | "k" | "p" };

export function tokenize(line: string): Tok[] {
  const out: Tok[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(line))) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), k: "p" });
    out.push({ t: m[0], k: m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : "k" });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ t: line.slice(last), k: "p" });
  return out;
}
