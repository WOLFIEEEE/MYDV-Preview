"use client";

import { Megaphone } from "lucide-react";
import DataAccordion from "../shared/DataAccordion";
import DataGrid from "../shared/DataGrid";

interface AdvertsTabProps {
  stockData: any;
}

export default function AdvertsTab({ stockData }: AdvertsTabProps) {
  const adverts = stockData.adverts || {};
  const retailAdverts = adverts.retailAdverts || {};

  const pricingItems = [
    { label: 'Price on Application', value: retailAdverts.priceOnApplication ? 'Yes' : 'No' },
    { label: 'Supplied Price', value: retailAdverts.suppliedPrice?.amountGBP || null, type: 'currency' as const },
    { label: 'Total Price', value: retailAdverts.totalPrice?.amountGBP || null, type: 'currency' as const },
    { label: 'Admin Fee', value: retailAdverts.adminFee?.amountGBP || null, type: 'currency' as const },
    { label: 'Manufacturer RRP', value: retailAdverts.manufacturerRRP?.amountGBP || null, type: 'currency' as const },
    { label: 'VAT Status', value: retailAdverts.vatStatus || null },
    { label: 'Price Indicator Rating', value: retailAdverts.priceIndicatorRating || null },
  ];

  const advertStatusItems = [
    { label: 'AutoTrader', value: retailAdverts.autotraderAdvert?.status || null },
    { label: 'Your Website', value: retailAdverts.advertiserAdvert?.status || null },
    { label: 'Dealer Search', value: retailAdverts.locatorAdvert?.status || null },
    { label: 'Partner Sites', value: retailAdverts.exportAdvert?.status || null },
    { label: 'Dealer Profile', value: retailAdverts.profileAdvert?.status || null },
  ];

  const accordionItems = [
    {
      title: 'Vehicle Pricing',
      children: <DataGrid items={pricingItems} />,
      defaultOpen: true,
    },
    {
      title: 'Advert Status',
      children: <DataGrid items={advertStatusItems} />,
      defaultOpen: true,
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 h-full">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Listing Details Information</h2>
        </div>
      </div>
      
      <DataAccordion items={accordionItems} />
    </div>
  );
}