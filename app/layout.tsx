import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ultimate 5",
  description: "Build a dream team that could never have existed. Win The Cup.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "Ultimate 5",
    description: "Build your dream team from across football history and simulate The Cup.",
    type: "website",
    url: "https://www.ultimate-5.app",
    images: [
      {
        url: "https://www.ultimate-5.app/og-image.png",
        width: 1200,
        height: 766,
        alt: "Ultimate 5",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ultimate 5",
    description: "Build your dream team from across football history and simulate The Cup.",
    images: ["https://www.ultimate-5.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <main className="flex-1">{children}</main>
        <Analytics />
        <footer
          className="text-center py-4 px-4 text-[11px] border-t"
          style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}
        >
          © 2026{" "}
          <a
            href="https://x.com/PartTimePundit"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--text-muted)" }}
            className="underline underline-offset-2"
          >
            Part-time Pundit
          </a>
          {" · "}
          <a
            href="mailto:hello@ultimate-5.app"
            style={{ color: "var(--text-muted)" }}
            className="underline underline-offset-2"
          >
            Feedback
          </a>
        </footer>
      </body>
    </html>
  );
}
