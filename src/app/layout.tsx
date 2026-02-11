import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제이미 vs 코잉이",
  description: "내가 이걸 왜 만든거지",
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
