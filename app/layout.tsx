import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { GlobalActivityIndicator } from "@/components/feedback/GlobalActivityIndicator";
import { NavigationLoadingIndicator } from "@/components/feedback/NavigationLoadingIndicator";
import { ConfirmDialogProvider } from "@/components/feedback/ConfirmDialogProvider";
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
        <ConfirmDialogProvider>
          <Navbar />
          <GlobalActivityIndicator />
          <Suspense fallback={null}>
            <NavigationLoadingIndicator />
          </Suspense>
          <div className="app-content">
            {children}
          </div>
        </ConfirmDialogProvider>
      </body>
    </html>
  );
}
