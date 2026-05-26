import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CMR — Content Media Room",
  description:
    "La plateforme intelligente de gestion et de diffusion de contenus média pour les chaînes de télévision modernes.",
  applicationName: "CMR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-[var(--bg-card)] !text-[var(--text-primary)] !border !border-[var(--border-glass-strong)] !backdrop-blur-xl !shadow-elevated",
            },
          }}
        />
      </body>
    </html>
  );
}
