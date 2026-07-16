import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TNU Timetable | The Neotia University",
    template: "%s | TNU Timetable",
  },
  description:
    "AI-Powered University Timetable Management System for The Neotia University. " +
    "Intelligent scheduling with OR-Tools CP-SAT optimization.",
  keywords: ["timetable", "university", "schedule", "The Neotia University", "TNU", "AI scheduling"],
  authors: [{ name: "The Neotia University" }],
  creator: "TNU IT Department",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://timetable.neotiauniversity.edu.in",
    title: "TNU Timetable Management System",
    description: "AI-Powered University Timetable Management for The Neotia University",
    siteName: "TNU Timetable",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} dark`}
      style={{ colorScheme: "dark" }}
    >
      <body className="antialiased min-h-screen bg-background text-foreground dark" style={{ colorScheme: "dark" }}>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(215 30% 10%)",
                border: "1px solid hsl(215 25% 18%)",
                color: "hsl(215 20% 95%)",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
