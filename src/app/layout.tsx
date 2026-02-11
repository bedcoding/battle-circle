import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Battle Circle",
  description: "Agar.io meets Battle Royale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
