import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpsPilot | AI Incident Response, Native to Slack",
  description:
    "Investigate outages, coordinate responders, analyze deployments, and generate postmortems without leaving Slack.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
