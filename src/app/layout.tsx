import type { Metadata, Viewport } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Slow Spider",
  description: "A calm, single-screen organizer for tasks, clusters, priorities and deadlines.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/favicon-64.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Slow Spider",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6b7a5e" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d1a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", sans.variable, newsreader.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('slowspider.theme')||'auto';var isDark=t==='dark'||(t==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(isDark){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}else{document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.remove('dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
