import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomaiyaSat Ground Control",
  description: "SomaiyaSat & SomaiyaPod: A PocketQube mission featuring autonomous AI-based inter-satellite data routing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black">
      <body className="min-h-screen bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
