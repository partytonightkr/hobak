import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commune - Connect, Share, Build Community",
  description: "A social platform for sharing ideas, building connections, and growing communities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface-50 font-sans antialiased dark:bg-surface-950">
        {children}
      </body>
    </html>
  );
}
