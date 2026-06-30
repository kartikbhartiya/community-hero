import type { Metadata, Viewport } from "next";
import Navbar from "@/components/Navbar";
import Assistant from "@/components/Assistant";
import PremiumEffects from "@/components/PremiumEffects";
import LoadingScreen from "@/components/LoadingScreen";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const DESCRIPTION =
  "Community Hero is an AI-powered civic platform to report, track and resolve hyperlocal issues — potholes, garbage, streetlights, water leaks and more — with live maps, SLA tracking, AI verification and citizen rewards.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Community Hero — Report & Resolve Local Civic Issues",
    template: "%s · Community Hero",
  },
  description: DESCRIPTION,
  applicationName: "Community Hero",
  keywords: [
    "civic issues", "report pothole", "community reporting", "municipal complaints",
    "smart city", "civic tech", "street light", "garbage collection", "RTI", "SLA tracking",
  ],
  authors: [{ name: "Community Hero" }],
  creator: "Community Hero",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Community Hero",
    title: "Community Hero — Report & Resolve Local Civic Issues",
    description: DESCRIPTION,
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Community Hero" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Hero — Hyperlocal Problem Solver",
    description: DESCRIPTION,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Fonts — preconnect + early stylesheet (faster than a CSS @import) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('ch-theme');
                  if (t === 'light' || t === 'dark') {
                    document.documentElement.setAttribute('data-theme', t);
                  }
                } catch(e) {}
              })();
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) {},
                    function(err) {}
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <LoadingScreen />
        <PremiumEffects />
        <Navbar />
        <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Assistant />
      </body>
    </html>
  );
}
