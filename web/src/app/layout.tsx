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
  metadataBase: new URL("https://www.kitha.co"),
  openGraph: {
    title: "Kitha - Detect AI-Generated Tweets Instantly",
    description: "Detect AI-generated tweets instantly with our Chrome extension. 95.6% accuracy, free to use.",
    type: "website",
    url: "https://www.kitha.co",
    siteName: "Kitha",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kitha - AI Tweet Detector",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitha - Detect AI-Generated Tweets",
    description: "Detect AI-generated tweets instantly with our Chrome extension. 95.6% accuracy, free to use.",
    images: ["/og-image.png"],
    creator: "@OrdinaryWeb3Dev",
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
