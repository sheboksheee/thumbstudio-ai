import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { DataBoot } from "@/components/data-boot";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThumbStudio AI",
  description: "Local-first YouTube thumbnail art-direction studio — ChatGPT Manual Mode.",
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/icon.svg` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1">
            <DataBoot>{children}</DataBoot>
          </main>
        </div>
        <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "hsl(220 7% 13%)", border: "1px solid hsl(220 6% 20%)", color: "hsl(210 20% 94%)" } }} />
      </body>
    </html>
  );
}
