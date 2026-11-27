import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, GmailError, SCOPE_SEND } from "@/server/mail/gmail";
import { saveAccount } from "@/server/mail/transport";
import { getProfile } from "@/server/matching";
import { withCvDefaults } from "@/server/lib/cv";
import { redirectUriFor } from "@/server/mail/redirect";

const back = (req: NextRequest, q: string) => {
  const res = NextResponse.redirect(new URL(`/settings/email?${q}`, req.url));
  res.cookies.delete({ name: "jh_oauth_state", path: "/api/mail/google" });
  res.cookies.delete({ name: "jh_oauth_verifier", path: "/api/mail/google" });
  return res;
};

/** Google's redirect back: check state, exchange the code (PKCE), store the refresh token encrypted. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return back(req, `error=${encodeURIComponent(p.get("error") === "access_denied" ? "You didn't allow access, so Gmail isn't connected." : `Google said: ${p.get("error")}`)}`);
  const state = p.get("state") ?? "";
  const expected = req.cookies.get("jh_oauth_state")?.value ?? "";
  const verifier = req.cookies.get("jh_oauth_verifier")?.value ?? "";
  if (!state || !expected || state.length !== expected.length || !timingSafeEqual(Buffer.from(state), Buffer.from(expected)) || !verifier)
    return back(req, `error=${encodeURIComponent("The sign-in expired or didn't come from this app. Try Connect Gmail again.")}`);
  try {
    const t = await exchangeCode({ code: p.get("code") ?? "", verifier, redirectUri: redirectUriFor(req) });
    if (!t.scopes.includes(SCOPE_SEND)) return back(req, `error=${encodeURIComponent("Google didn't grant permission to send. Tick the box to send email on your behalf and try again.")}`);
    const profile = await getProfile();
    const name = profile?.cv ? withCvDefaults(profile.cv).contact.name : null;
    await saveAccount({ method: "gmail_oauth", email: t.email, name, secret: t.refreshToken, scopes: t.scopes });
    return back(req, "connected=1");
  } catch (e) {
    return back(req, `error=${encodeURIComponent(e instanceof GmailError ? e.message : "Couldn't finish connecting Gmail.")}`);
  }
}
