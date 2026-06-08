import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ultimate 5",
  description: "Build a dream team that could never have existed. Win The Cup.",
  openGraph: {
    title: "Ultimate 5",
    description: "Build your dream team from across football history and simulate The Cup.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
