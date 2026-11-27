import type { NextRequest } from "next/server";

/** The OAuth redirect address registered in the Google Cloud client: APP_URL, or the address the app is opened at. */
export const redirectUriFor = (req: NextRequest) => `${process.env.APP_URL?.replace(/\/$/, "") || req.nextUrl.origin}/api/mail/google/callback`;
