import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import PrefetchRoutes from "@/components/PrefetchRoutes";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Waypoint",
  description: "Your personal life operating system",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Waypoint",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0B0F",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value as "dark" | "light" | "system" | undefined;
  const defaultTheme = themeCookie ?? "system";

  return (
    <html lang="nl" className={defaultTheme === "system" ? "" : defaultTheme} suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = document.cookie.match(/(?:^|; )theme=([^;]*)/)?.[1] || 'system';
                  var resolved = theme === 'system'
                    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : theme;
                  document.documentElement.classList.remove('dark', 'light');
                  document.documentElement.classList.add(resolved);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider defaultTheme={defaultTheme}>
          {children}
          <PrefetchRoutes />
        </ThemeProvider>
      </body>
    </html>
  );
}
