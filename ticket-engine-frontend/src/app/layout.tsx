import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Ticket Engine",
  description: "Real-time theater seat reservation engine with zero race conditions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
    > <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen`}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
