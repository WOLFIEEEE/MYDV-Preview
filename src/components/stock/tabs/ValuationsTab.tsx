"use client";

import { useTheme } from "@/contexts/ThemeContext";

interface ValuationsTabProps {
  stockData: any;
}

export default function ValuationsTab({ stockData }: ValuationsTabProps) {
  const { isDarkMode } = useTheme();
  const valuations = stockData.valuations || {};
  const marketAverage = valuations.marketAverage || {};
  const adjusted = valuations.adjusted || {};

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Helper function to get amount from any of the possible fields
  const getAmount = (valueObj: any): number | null => {
    if (!valueObj || typeof valueObj !== 'object') return null;
    
    // Try amountGBP first, then amountNoVatGBP, then amountExcludingVatGBP
    return valueObj.amountGBP ?? valueObj.amountNoVatGBP ?? valueObj.amountExcludingVatGBP ?? null;
  };

  const ValuationCard = ({ title, data }: { title: string; data: any }) => {
    const retailAmount = getAmount(data.retail);
    const tradeAmount = getAmount(data.trade);
    const partExchangeAmount = getAmount(data.partExchange);
    const privateAmount = getAmount(data.private);

    return (
      <div className={`p-6 rounded-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } shadow-sm`}>
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        
        {retailAmount !== null && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-500 dark:text-white mb-1">Retail Value</h4>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatPrice(retailAmount)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {tradeAmount !== null && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-white">Trade Value</div>
              <div className="text-lg font-semibold">{formatPrice(tradeAmount)}</div>
            </div>
          )}
          {partExchangeAmount !== null && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-white">Part Exchange Value</div>
              <div className="text-lg font-semibold">{formatPrice(partExchangeAmount)}</div>
            </div>
          )}
          {privateAmount !== null && (
            <div>
              <div className="text-sm font-medium text-gray-500 dark:text-white">Private Value</div>
              <div className="text-lg font-semibold">{formatPrice(privateAmount)}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Valuations</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.keys(marketAverage).length > 0 && (
          <ValuationCard title="Market Average Valuations" data={marketAverage} />
        )}
        
        {Object.keys(adjusted).length > 0 && (
          <ValuationCard title="Adjusted Valuations" data={adjusted} />
        )}
        
        {Object.keys(marketAverage).length === 0 && Object.keys(adjusted).length === 0 && (
          <div className={`col-span-2 p-8 text-center rounded-lg ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}>
            <h3 className="text-lg font-semibold mb-2">No Valuations Available</h3>
            <p className="text-gray-500 dark:text-white">
              Valuation data is not available for this vehicle.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}