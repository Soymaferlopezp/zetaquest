import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Press_Start_2P } from "next/font/google";
import Providers from "./providers"; 

export const metadata: Metadata = {
  title: "ZetaQuest",
  description: "RPG-lite cross-chain demo",
};

const pixel = localFont({
  src: "./fonts/pixel-emulator.otf",
  variable: "--font-pixel",
  weight: "400",
  display: "swap",
});

const press = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-press",
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${pixel.variable} ${press.variable}`}>
      <body className="font-press bg-black text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


