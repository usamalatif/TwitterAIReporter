import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kitha - Detect AI-Generated Tweets Instantly",
  description: "Kitha uses advanced AI to analyze tweets and show you which ones are likely written by AI. Stay informed about what you're reading on Twitter/X.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "Kitha - Detect AI-Generated Tweets Instantly",
    description: "Kitha uses advanced AI to analyze tweets and show you which ones are likely written by AI.",
    type: "website",
    url: "https://www.kitha.co",
  },
  twitter: {
    card: "summary",
    title: "Kitha - Detect AI-Generated Tweets",
    description: "Detect AI-generated tweets instantly with our Chrome extension.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-3C7RNYFJ4Q"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-3C7RNYFJ4Q');
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
