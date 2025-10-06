import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import QueryProvider from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import GlobalNumberInputWheelDisabler from "@/components/GlobalNumberInputWheelDisabler";
import "./globals.css";

export const metadata: Metadata = {
  title: "MydealershipView - Premium Car Dealership Management",
  description: "Professional car dealership management platform with inventory tracking, margin analysis, and comprehensive business tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className="antialiased min-h-screen"
          style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
        >
          <QueryProvider>
            <ThemeProvider>
              <NotificationProvider>
                <GlobalNumberInputWheelDisabler />
                {children}
                <Toaster />
              </NotificationProvider>
            </ThemeProvider>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
