import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import { SidebarNav } from "@/components/sidebar-nav";
import { ContextPanelProvider } from "@/components/context-panel-provider";
import { ContextPanel } from "@/components/context-panel";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tractable — Regulatory Compliance Management",
  description:
    "Map financial products to regulatory obligations across jurisdictions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body suppressHydrationWarning className="flex h-screen overflow-hidden">
        <SidebarNav />
        <ContextPanelProvider>
          <main className="flex-1 min-w-0 p-8 overflow-y-auto">{children}</main>
          <ContextPanel />
        </ContextPanelProvider>
      </body>
    </html>
  );
}
