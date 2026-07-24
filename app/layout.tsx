import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const assistant = Assistant({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Japan Trip",
  description: "Personal itinerary planner for the Japan trip",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#11161c" },
  ],
};

// Runs before hydration (first thing parsed in <body>) so a saved theme
// preference applies before first paint — no flash of the wrong theme.
// Only *sets* the attribute when a preference was saved; otherwise the
// `color-scheme: light dark` in globals.css lets the OS preference apply.
const noFlashThemeScript = `
try {
  var t = localStorage.getItem("theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${assistant.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="mx-auto flex h-full min-h-screen max-w-screen-sm flex-col bg-background text-foreground">
        <script dangerouslySetInnerHTML={{ __html: noFlashThemeScript }} />
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
