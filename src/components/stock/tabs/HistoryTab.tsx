"use client";

import DataAccordion from "../shared/DataAccordion";
import DataGrid from "../shared/DataGrid";

interface HistoryTabProps {
  stockData: any;
}

export default function HistoryTab({ stockData }: HistoryTabProps) {
  const history = stockData.history || {};
  const check = stockData.check || {};
  const vehicle = stockData.vehicle || {};

  const historyItems = [
    { label: 'Previous Owners', value: history.previousOwners || vehicle.previousOwners },
    { label: 'Exported', value: history.exported, type: 'boolean' as const },
    { label: 'Stolen', value: history.stolen, type: 'boolean' as const },
    { label: 'Imported', value: history.imported, type: 'boolean' as const },
    { label: 'Scrapped', value: history.scrapped, type: 'boolean' as const },
    { label: 'First Registration', value: vehicle.firstRegistrationDate, type: 'date' as const },
  ];

  const checkItems = [
    { label: 'Scrapped', value: check.scrapped, type: 'boolean' as const },
    { label: 'Stolen', value: check.stolen, type: 'boolean' as const },
    { label: 'Imported', value: check.imported, type: 'boolean' as const },
    { label: 'Exported', value: check.exported, type: 'boolean' as const },
    { label: 'Private Finance', value: check.privateFinance, type: 'boolean' as const },
    { label: 'Trade Finance', value: check.tradeFinance, type: 'boolean' as const },
    { label: 'High Risk', value: check.highRisk, type: 'boolean' as const },
    { label: 'Mileage Discrepancy', value: check.mileageDiscrepancy, type: 'boolean' as const },
    { label: 'Colour Changed', value: check.colourChanged, type: 'boolean' as const },
    { label: 'Registration Changed', value: check.registrationChanged, type: 'boolean' as const },
    { label: 'Previous Owners', value: check.previousOwners },
  ];

  const accordionItems = [
    {
      title: 'History Information',
      children: <DataGrid items={historyItems} />,
      defaultOpen: true,
    },
    {
      title: 'Vehicle Checks',
      children: <DataGrid items={checkItems} />,
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Vehicle History</h2>
      </div>
      
      <DataAccordion items={accordionItems} />
    </div>
  );
}