import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authUrl, oauthConfigured, pkce } from "@/server/mail/gmail";
import { redirectUriFor } from "@/server/mail/redirect";
import { getAccount } from "@/server/mail/transport";

/** Start "Connect Gmail": PKCE + state in short-lived httpOnly cookies, then Google's consent screen. */
export async function GET(req: NextRequest) {
  if (!oauthConfigured()) return NextResponse.redirect(new URL("/settings/email?error=Add%20GOOGLE_CLIENT_ID%20and%20GOOGLE_CLIENT_SECRET%20to%20.env%20first", req.url));
  const replies = req.nextUrl.searchParams.get("replies") === "1";
  const state = randomBytes(16).toString("hex");
  const { verifier, challenge } = pkce();
  const account = await getAccount();
  const res = NextResponse.redirect(authUrl({ redirectUri: redirectUriFor(req), state, challenge, replies, loginHint: account?.email }));
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/api/mail/google", maxAge: 600, secure: req.nextUrl.protocol === "https:" };
  res.cookies.set("jh_oauth_state", state, opts);
  res.cookies.set("jh_oauth_verifier", verifier, opts);
  return res;
}
