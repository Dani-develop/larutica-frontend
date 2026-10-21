import type { Metadata } from "next";
import "./globals.css";
import "@/modules/booking/booking.css";
import "./design-system.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LaRutica | Explora Costa Rica",
  description: "Tours, transporte y experiencias locales en Costa Rica.",
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/brand/favicon-32.png",
    apple: "/brand/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head><link rel="preload" href="/fonts/poppins-400-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" /></head>
      <body
        className="antialiased"
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
