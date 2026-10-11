import { useState } from "react";
import { resetPassword } from "../api/auth";

export function ResetPassword() {
  const token = new URLSearchParams(location.search).get("token") ?? "";
  const [pw, setPw] = useState("");
  const [done, setDone] = useState(false);
  return done ? <p>Şifren güncellendi.</p> : (
    <form onSubmit={async (e) => { e.preventDefault(); await resetPassword(token, pw); setDone(true); }}>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} />
      <button>Şifremi güncelle</button>
    </form>
  );
}
