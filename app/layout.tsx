import type { Metadata } from "next";
import { Reenie_Beanie, Geist_Mono } from "next/font/google";
import "./globals.css";

const reenieBeanie = Reenie_Beanie({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-reenie-beanie",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "postcard",
  description: "A pretext exploration demo inspired by a trip to Buenos Aires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${reenieBeanie.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
