"use client";

import DataGrid from "../shared/DataGrid";

interface AdvertiserTabProps {
  stockData: any;
}

export default function AdvertiserTab({ stockData }: AdvertiserTabProps) {
  const advertiser = stockData.advertiser || {};
  const location = advertiser.location || {};

  const advertiserItems = [
    { label: 'Advertiser ID', value: advertiser.advertiserId },
    { label: 'Name', value: advertiser.name },
    { label: 'Segment', value: advertiser.segment },
    { label: 'Website', value: advertiser.website },
    { label: 'Phone', value: advertiser.phone },
    { label: 'Address', value: `${location.addressLineOne || ''} ${location.town || ''} ${location.postCode || ''}`.trim() },
    { label: 'County', value: location.county },
    { label: 'Region', value: location.region },
    { label: 'Post Code', value: location.postCode },
    { label: 'Coordinates', value: location.latitude && location.longitude ? `${location.latitude}, ${location.longitude}` : null },
    { label: 'Advert Strapline', value: advertiser.advertStrapline },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Advertiser Details</h2>
      </div>
      
      <DataGrid items={advertiserItems} />
    </div>
  );
}