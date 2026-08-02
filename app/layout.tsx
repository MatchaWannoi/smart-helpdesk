import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Helpdesk",
  description: "AI-assisted helpdesk system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body>
        <Navbar />
        <div className="app-content">
          {children}
        </div>
      </body>
    </html>
  );
}
