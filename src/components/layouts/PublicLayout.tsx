"use client";

import { ReactNode } from "react";
import PublicHeader from "@/components/shared/PublicHeader";
import Footer from "@/components/shared/Footer";
import { useTheme } from "@/contexts/ThemeContext";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-white to-blue-50'
    }`}>
      <PublicHeader />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
} 