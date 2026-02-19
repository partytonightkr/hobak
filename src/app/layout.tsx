import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hobak - Your Best Friend",
  description: "A social platform for dogs and their humans. Share your pup's adventures, connect with fellow dog lovers, and build your pack.",
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
