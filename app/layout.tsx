import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mój Sad — dziennik gospodarstwa",
  description: "Zbiory wiśni i czereśni, ewidencja drzew, nawożenie i podlewanie.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
