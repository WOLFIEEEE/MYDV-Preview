"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import { useTheme } from "@/contexts/ThemeContext";

interface BackToStockButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function BackToStockButton({ 
  className = "", 
  children 
}: BackToStockButtonProps) {
  const { isDarkMode } = useTheme();
  const { goBack } = useNavigationHistory();

  return (
    <Button
      onClick={goBack}
      variant="outline"
      className={`flex items-center gap-2 ${
        isDarkMode 
          ? 'border-slate-600 text-slate-300 hover:bg-slate-700' 
          : 'border-slate-300 text-slate-700 hover:bg-slate-50'
      } ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {children || "Back to Stock"}
    </Button>
  );
}
