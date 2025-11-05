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
  
  // Handle both adverts and advertsData (from cache) structures
  const adverts = stockData.adverts || stockData.advertsData || {};
  const retailAdverts = adverts.retailAdverts || {};
  const metadata = stockData.metadata || stockData.metadataRaw || {};

  // VAT Status: prefer retailAdverts.vatStatus, fallback to forecourtPriceVatStatus
  const vatStatus = retailAdverts.vatStatus || adverts.forecourtPriceVatStatus || null;

  // Pricing Information
  const pricingItems = [
    { label: 'Forecourt Price', value: adverts.forecourtPrice?.amountGBP || null, type: 'currency' as const },
    { label: 'Price on Application', value: retailAdverts.priceOnApplication ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Supplied Price', value: retailAdverts.suppliedPrice?.amountGBP || null, type: 'currency' as const },
    { label: 'Total Price', value: retailAdverts.totalPrice?.amountGBP || null, type: 'currency' as const },
    { label: 'Admin Fee', value: retailAdverts.adminFee?.amountGBP || null, type: 'currency' as const },
    { label: 'Manufacturer RRP', value: retailAdverts.manufacturerRRP?.amountGBP || null, type: 'currency' as const },
    { label: 'VAT Status', value: vatStatus },
    { label: 'Price Indicator Rating', value: retailAdverts.priceIndicatorRating || null },
  ];

  // Listing Information
  const listingItems = [
    { label: 'Lifecycle State', value: metadata.lifecycleState || null },
    { label: 'Reservation Status', value: adverts.reservationStatus || null },
    { label: 'Attention Grabber', value: retailAdverts.attentionGrabber || adverts.attentionGrabber || null },
  ];

  // Description Information
  const descriptionItems = [
    { label: 'Description', value: retailAdverts.description || null },
    { label: 'Description 2', value: retailAdverts.description2 || null },
  ];

  // Retail Advert Status (Channels)
  const retailAdvertStatusItems = [
    { label: 'AT Search & Find', value: retailAdverts.autotraderAdvert?.status || null },
    { label: 'AT Dealer Page', value: retailAdverts.profileAdvert?.status || null },
    { label: 'Dealer Website', value: retailAdverts.advertiserAdvert?.status || null },
    { label: 'AT Linked Advertisers', value: retailAdverts.exportAdvert?.status || null },
    { label: 'Manufacturer Website / Used Vehicle Locators', value: retailAdverts.locatorAdvert?.status || null },
  ];

  // Trade Advert Status
  const tradeAdvertStatusItems = [
    { label: 'Dealer Auction Advert', value: adverts.tradeAdverts?.dealerAuctionAdvert?.status || null },
  ];

  // Display Options
  const displayOptions = retailAdverts.displayOptions || {};
  const displayOptionItems = [
    { label: 'Exclude Previous Owners', value: displayOptions.excludePreviousOwners ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude Strapline', value: displayOptions.excludeStrapline ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude MOT', value: displayOptions.excludeMot ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude Warranty', value: displayOptions.excludeWarranty ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude Interior Details', value: displayOptions.excludeInteriorDetails ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude Tyre Condition', value: displayOptions.excludeTyreCondition ? 'Yes' : 'No', type: 'boolean' as const },
    { label: 'Exclude Body Condition', value: displayOptions.excludeBodyCondition ? 'Yes' : 'No', type: 'boolean' as const },
  ];

  const accordionItems = [
    {
      title: 'Vehicle Pricing',
      children: <DataGrid items={pricingItems} />,
      defaultOpen: true,
    },
    {
      title: 'Listing Information',
      children: <DataGrid items={listingItems} columns={1} />,
      defaultOpen: true,
    },
    {
      title: 'Descriptions',
      children: <DataGrid items={descriptionItems} columns={1} />,
      defaultOpen: false,
    },
    {
      title: 'Retail Advert Status',
      children: <DataGrid items={retailAdvertStatusItems} />,
      defaultOpen: true,
    },
    {
      title: 'Trade Advert Status',
      children: <DataGrid items={tradeAdvertStatusItems} />,
      defaultOpen: false,
    },
    {
      title: 'Display Options',
      children: <DataGrid items={displayOptionItems} />,
      defaultOpen: false,
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