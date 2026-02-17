import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "materialililil — PBR Texture Maps",
  description: "Turn any image into production-ready PBR texture maps. Height, Normal, Diffuse, Metallic, Roughness, AO, Edge maps and more. Client-side, no uploads. Export for Blender, Unity, Unreal, Godot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="antialiased bg-zinc-950 text-zinc-100 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
