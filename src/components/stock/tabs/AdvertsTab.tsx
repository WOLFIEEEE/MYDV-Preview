"use client";

import { useState } from "react";
import { Edit3, Megaphone } from "lucide-react";
import DataAccordion from "../shared/DataAccordion";
import DataGrid from "../shared/DataGrid";
import { Button } from "@/components/ui/button";
import EditListingModal from "../edit-tabs/EditListingModal";

interface AdvertsTabProps {
  stockData: any;
  stockId?: string;
}

export default function AdvertsTab({ stockData, stockId }: AdvertsTabProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
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
    { label: 'AT Search & Find', value: retailAdverts.autotraderAdvert?.status || null },
    { label: 'AT Dealer Page', value: retailAdverts.profileAdvert?.status || null },
    { label: 'Dealer Website', value: retailAdverts.advertiserAdvert?.status || null },
    { label: 'AT Linked Advertisers', value: retailAdverts.exportAdvert?.status || null },
    { label: 'Manufacturer Website / Used Vehicle Locators', value: retailAdverts.locatorAdvert?.status || null },
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
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Listing Details Information</h2>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          Edit Listing
        </Button>
      </div>
      
      <DataAccordion items={accordionItems} />

      {/* Edit Listing Modal */}
      <EditListingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        stockData={stockData}
        stockId={stockId}
        onSave={() => {
          // Optionally refresh data or show notification
          console.log('Listing updated successfully');
        }}
      />
    </div>
  );
}