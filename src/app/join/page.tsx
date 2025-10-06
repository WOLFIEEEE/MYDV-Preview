"use client";

import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useTheme } from "@/contexts/ThemeContext";

export default function JoinPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // Redirect to the proper Clerk sign-up route
    router.push('/sign-up');
  }, [router]);

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isDarkMode ? 'bg-slate-900' : 'bg-gray-50'
    }`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className={`mt-4 text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Redirecting to sign up...
        </p>
          </div>
        </div>
  );
} 