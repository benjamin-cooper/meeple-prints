import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = Response.json({ ok: true });
  // Must match the attributes the cookie was set with (login route) for
  // the browser to recognize this as clearing the same cookie.
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  return res;
}
