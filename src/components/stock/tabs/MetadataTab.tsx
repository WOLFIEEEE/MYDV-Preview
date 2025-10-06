"use client";

import DataAccordion from "../shared/DataAccordion";
import DataGrid from "../shared/DataGrid";

interface MetadataTabProps {
  stockData: any;
}

export default function MetadataTab({ stockData }: MetadataTabProps) {
  const metadata = stockData.metadata || {};

  const lifecycleItems = [
    { label: 'Lifecycle State', value: metadata.lifecycleState },
    { label: 'Date on Forecourt', value: metadata.dateOnForecourt, type: 'date' as const },
  ];

  const sourceItems = [
    { label: 'External Stock ID', value: metadata.externalStockId },
    { label: 'External Stock Reference', value: metadata.externalStockReference },
  ];

  const otherMetadataItems = [
    { label: 'Stock ID', value: metadata.stockId },
    { label: 'Search ID', value: metadata.searchId },
    { label: 'Last Updated', value: metadata.lastUpdated, type: 'date' as const },
    { label: 'Last Updated by Advertiser', value: metadata.lastUpdatedByAdvertiser, type: 'date' as const },
    { label: 'Version Number', value: metadata.versionNumber },
  ];

  const accordionItems = [
    {
      title: 'Lifecycle Information',
      children: <DataGrid items={lifecycleItems} />,
      defaultOpen: true,
    },
    {
      title: 'Source Information',
      children: <DataGrid items={sourceItems} />,
    },
    {
      title: 'Other Metadata',
      children: <DataGrid items={otherMetadataItems} />,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Metadata</h2>
      </div>
      
      <DataAccordion items={accordionItems} />
    </div>
  );
}