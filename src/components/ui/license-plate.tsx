"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface LicensePlateProps {
  registration: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const LicensePlate: React.FC<LicensePlateProps> = ({ 
  registration, 
  size = 'md', 
  className,
  onClick
}) => {
  // Size configurations - adjusted to show full license plate
  const sizeConfig = {
    sm: {
      container: 'h-10 w-44',
      text: 'text-[14px]'
    },
    md: {
      container: 'h-9 w-40',
      text: 'text-[13px]'
    },
    lg: {
      container: 'h-11 w-48',
      text: 'text-base'
    },
    xl: {
      container: 'h-14 w-56',
      text: 'text-lg'
    }
  };

  const config = sizeConfig[size];

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center",
        config.container,
        onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : "",
        className
      )}
      onClick={onClick}
    >
      {/* License Plate Background Image */}
      <Image
        src="/Vehicle Registration.jpeg"
        alt="UK License Plate"
        fill
        className="object-contain rounded-sm"
      />
      
      {/* Registration Text Overlay */}
      <div className={cn(
        "relative z-10 font-mono font-bold text-black text-center tracking-wider",
        config.text
      )}>
        {registration || 'N/A'}
      </div>
    </div>
  );
};

export default LicensePlate;
