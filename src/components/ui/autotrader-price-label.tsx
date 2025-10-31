import { PoundSterling } from 'lucide-react';
import Image from 'next/image';
import React from 'react'

const AutotraderPriceCard = ({
  priceIndicatorRating,
  showWithoutIcon = false
}: {
  priceIndicatorRating: string,
  showWithoutIcon?: boolean
}) => {
  const getPriceIndicatorColor = (rating: string) => {
    switch (rating?.toLowerCase()) {
      case 'great':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'noanalysis':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-white';
    }
  };


  const getMiniPrice = (priceStatus: string) => {
    switch (priceStatus?.toLowerCase()) {
      case 'low':
        return (
          <img
            src="/autotrader-logos/mini/lower.png"
            alt={priceStatus}
            width={100}
            height={24}
            style={{ objectFit: 'contain', padding: '0.5rem 0' }}
          />
        )
      case 'great':
        return (
          <img
            src="/autotrader-logos/mini/great.png"
            alt={priceStatus}
            width={100}
            height={24}
            style={{ objectFit: 'contain', padding: '0.5rem 0' }}
          />
        )
      case 'good':
        return (
          <img
            src="/autotrader-logos/mini/good.png"
            alt={priceStatus}
            width={100}
            height={24}
            style={{ objectFit: 'contain', padding: '0.5rem 0' }}
          />
        )
      case 'fair':
        return (
          <img
            src="/autotrader-logos/mini/fair.png"
            alt={priceStatus}
            width={100}
            height={24}
            style={{ objectFit: 'contain', padding: '0.5rem 0' }}
          />
        )
      case 'high':
        return (
          <img
            src="/autotrader-logos/mini/higher.png"
            alt={priceStatus}
            width={100}
            height={24}
            style={{ objectFit: 'contain', padding: '0.5rem 0' }}
          />
        )
      default:
        if (showWithoutIcon) {
          return (
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${priceIndicatorRating === 'GREAT'
                  ? 'bg-green-500/20 text-green-400'
                  : priceIndicatorRating === 'GOOD'
                    ? 'bg-blue-500/20 text-blue-400'
                    : priceIndicatorRating === 'FAIR'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-500/20 text-slate-400'
                }`}
            >
              {priceIndicatorRating || 'N/A'}
            </span>
          );
        } else {
          return (
            <div
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs ${getPriceIndicatorColor(priceIndicatorRating)}`}
            >
              <PoundSterling className="h-3 w-3 mr-0.5" />
              {priceIndicatorRating === 'NOANALYSIS' ? 'Not Analysed' : priceIndicatorRating}
            </div>
          );
        }

    }

  }

  return (
    <>
      {getMiniPrice(priceIndicatorRating)}
    </>
  )
}

export default AutotraderPriceCard