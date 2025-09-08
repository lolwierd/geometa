import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GeoMeta Gallery - Your GeoGuessr Meta Collection",
  description:
    "Automatically capture and organize GeoGuessr meta clues with our smart browser extension and beautiful gallery interface.",
  keywords: ["geoguessr", "meta", "geography", "game", "clues", "learning"],
  authors: [{ name: "GeoMeta Team" }],
  robots: "index, follow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">{children}</body>
    </html>
  );
}
