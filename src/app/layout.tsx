import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meridian — Cinema Seat Preview",
  description:
    "Meridian — interactive 2D-to-3D cinema seat preview & booking. Pick a seat on the IMAX map, then drop into a first-person auditorium view to check sightlines, FOV, and distance before you book.",
  keywords: [
    "Meridian",
    "cinema",
    "IMAX",
    "seat preview",
    "3D booking",
    "WebGL",
    "Three.js",
  ],
  authors: [{ name: "Meridian" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased bg-[#0A0A0C] text-white font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
