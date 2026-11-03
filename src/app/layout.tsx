import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { DataBoot } from "@/components/data-boot";
import "./globals.css";

const font = IBM_Plex_Sans_Arabic({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-ar", display: "swap" });
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "ThumbStudio — استوديو الثمبنيلات",
  description: "جهّز برومبتات ثمبنيلات يوتيوب احترافية لـ ChatGPT في ثواني.",
  icons: { icon: `${base}/icon.svg`, apple: `${base}/icon.svg` },
  appleWebApp: { capable: true, title: "ThumbStudio", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#111317", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${font.variable}`}>
      <body className="min-h-screen overflow-x-hidden font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 pb-[calc(env(safe-area-inset-bottom)+72px)] md:pb-0">
            <DataBoot>{children}</DataBoot>
          </main>
        </div>
        <MobileNav />
        <Toaster
          theme="dark"
          dir="rtl"
          position="top-center"
          toastOptions={{ style: { background: "hsl(220 7% 13%)", border: "1px solid hsl(220 6% 20%)", color: "hsl(210 20% 94%)", fontFamily: "var(--font-ar)" } }}
        />
      </body>
    </html>
  );
}
