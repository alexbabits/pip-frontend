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

export const metadata = {
  title: "Pulse In Private",
  description: "Private Transactions for PulseChain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-force-color-scheme="light">
      <head>
        <meta name="darkreader-lock" content="true" />
        <meta name="darkreader" content="disable" />
        <meta name="color-scheme" content="light only" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script 
          src="/snarkjs.min.js" 
          strategy="lazyOnload"
        />
        {children}
      </body>
    </html>
  );
}