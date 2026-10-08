import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import "@/modules/booking/booking.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Tripadvisor's brand guidelines name Poppins as the fallback for its proprietary Trip Sans.
const poppins = Poppins({
  variable: "--font-trip",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
