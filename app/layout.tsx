import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomaiyaSat Ground Control",
  description: "SomaiyaSat & SomaiyaPod: A PocketQube mission featuring autonomous AI-based inter-satellite data routing",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/somaiya-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/somaiya-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: "if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; window.scrollTo(0, 0); }",
          }}
        />
      </head>
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
