"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { useNavigationHistory } from "@/hooks/useNavigationHistory";
import BackToStockButton from "@/components/shared/BackToStockButton";

interface AddToStockButtonProps {
  vehicleData: {
    registration: string;
    make: string;
    model: string;
    year: string;
    mileage: string;
  };
  onAddToStock?: (vehicleData: any) => void;
  className?: string;
}

export default function AddToStockButton({ 
  vehicleData, 
  onAddToStock,
  className = "" 
}: AddToStockButtonProps) {
  const { isDarkMode } = useTheme();
  const router = useRouter();
  const { setPreviousPath } = useNavigationHistory();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToStock = async () => {
    setIsAdding(true);
    
    try {
      // Simulate API call to add vehicle to stock
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the callback if provided
      onAddToStock?.(vehicleData);
      
      setIsAdded(true);
      
      // Navigate to stock page after successful addition
      setTimeout(() => {
        // Store current path for potential back navigation
        setPreviousPath(window.location.pathname + window.location.search);
        router.push('/mystock');
      }, 1500);
      
    } catch (error) {
      console.error('Error adding to stock:', error);
      alert('Failed to add vehicle to stock. Please try again.');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
      {/* Back to Stock Button */}
      <BackToStockButton className="px-6 py-3" />
      
      {/* Add to Stock Button */}
      {isAdded ? (
        <Button
          disabled
          className={`bg-green-600 hover:bg-green-600 text-white ${className}`}
        >
          <Check className="w-5 h-5 mr-2" />
          Added to Stock
        </Button>
      ) : (
        <Button
          onClick={handleAddToStock}
          disabled={isAdding}
          className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
          data-registration={vehicleData.registration}
          data-mileage={vehicleData.mileage.replace(/[^0-9]/g, '')}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Adding to Stock...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Add to Stock
            </>
          )}
        </Button>
      )}
    </div>
  );
}
