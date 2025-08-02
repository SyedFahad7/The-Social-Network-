import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientOnly } from "@/components/ui/client-only";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Social Network - Academic Portal",
  description: "Academic portal for students, teachers, and administrators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <ClientOnly>
            <AuthProvider>{children}</AuthProvider>
          </ClientOnly>
        </ThemeProvider>
      </body>
    </html>
  );
}
