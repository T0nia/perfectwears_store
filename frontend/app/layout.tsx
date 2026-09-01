import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perfectwears | Fashion & Style",
  description:
    "Discover clothing, footwear, fragrances, accessories and more at Perfectwears.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}