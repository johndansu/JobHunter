import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobHunter: remote jobs you can actually take",
  description: "Remote jobs in every category, filtered to the ones open to your country, with the evidence behind every verdict.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Job<span className="text-accent">Hunter</span>
            </Link>
            <nav className="flex gap-5 text-sm text-muted">
              <Link href="/" className="hover:text-ink">Jobs</Link>
              <Link href="/matches" className="hover:text-ink">My matches</Link>
              <Link href="/why-not" className="hover:text-ink">Why not me?</Link>
              <Link href="/profile" className="hover:text-ink">Profile</Link>
              <Link href="/sources" className="hover:text-ink">Sources</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-5 text-xs leading-relaxed text-muted">
            Jobs come from{" "}
            <a className="underline" href="https://himalayas.app">Himalayas</a>,{" "}
            <a className="underline" href="https://remoteok.com">Remote OK</a>,{" "}
            <a className="underline" href="https://jobicy.com">Jobicy</a>,{" "}
            <a className="underline" href="https://remotejobs.org">Powered by RemoteJobs.org</a>{" "}
            and employers&apos; own Greenhouse, Lever and Ashby boards. Every Apply button goes to the source&apos;s own link.
            Eligibility verdicts are automated readings of each posting, not legal advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
