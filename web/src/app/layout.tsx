import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: "Fresco Temperature Dashboard",
  description: "Local-first grow-bag thermal validation dashboard.",
  openGraph: {
    title: "Fresco Temperature Dashboard",
    description: "Local-first grow-bag thermal validation dashboard.",
    type: "website",
    images: [
      {
        url: "/screenshot.png",
        width: 1200,
        height: 630,
        alt: "Fresco Temperature Dashboard",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fresco Temperature Dashboard",
    description: "Local-first grow-bag thermal validation dashboard.",
    images: ["/screenshot.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full font-sans antialiased"
    >
      <body className="min-h-full">
        <ThemeProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
