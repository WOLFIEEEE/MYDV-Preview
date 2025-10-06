"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import DataAccordion from "../shared/DataAccordion";

interface JsonTabProps {
  stockData: any;
}

export default function JsonTab({ stockData }: JsonTabProps) {
  const { isDarkMode } = useTheme();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = async (data: any, section: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const JsonSection = ({ title, data, sectionKey }: { title: string; data: any; sectionKey: string }) => (
    <div className={`rounded-lg ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    } shadow-sm`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold">{title}</h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => copyToClipboard(data, sectionKey)}
        >
          {copiedSection === sectionKey ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div className="p-4">
        <pre className={`text-xs overflow-auto max-h-96 ${
          isDarkMode ? 'text-white' : 'text-gray-700'
        }`}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );

  const accordionItems = [
    {
      title: 'Vehicle Data',
      children: <JsonSection title="Vehicle Data" data={stockData.vehicle || {}} sectionKey="vehicle" />,
    },
    {
      title: 'Media Data',
      children: <JsonSection title="Media Data" data={stockData.media || {}} sectionKey="media" />,
    },
    {
      title: 'Adverts Data',
      children: <JsonSection title="Adverts Data" data={stockData.adverts || {}} sectionKey="adverts" />,
    },
    {
      title: 'Advertiser Data',
      children: <JsonSection title="Advertiser Data" data={stockData.advertiser || {}} sectionKey="advertiser" />,
    },
    {
      title: 'Features Data',
      children: <JsonSection title="Features Data" data={stockData.features || []} sectionKey="features" />,
    },
    {
      title: 'Highlights Data',
      children: <JsonSection title="Highlights Data" data={stockData.highlights || []} sectionKey="highlights" />,
    },
    {
      title: 'History Data',
      children: <JsonSection title="History Data" data={stockData.history || {}} sectionKey="history" />,
    },
    {
      title: 'Check Data',
      children: <JsonSection title="Check Data" data={stockData.check || {}} sectionKey="check" />,
    },
    {
      title: 'Valuations Data',
      children: <JsonSection title="Valuations Data" data={stockData.valuations || {}} sectionKey="valuations" />,
    },
    {
      title: 'Response Metrics Data',
      children: <JsonSection title="Response Metrics Data" data={stockData.responseMetrics || {}} sectionKey="responseMetrics" />,
    },
    {
      title: 'Metadata',
      children: <JsonSection title="Metadata" data={stockData.metadata || {}} sectionKey="metadata" />,
    },
  ];

  return (
    <div className="p-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Raw JSON Data</h2>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(stockData, 'all')}
          >
            {copiedSection === 'all' ? 'Copied!' : 'Copy All'}
          </Button>
        </div>
      </div>

      {/* JSON Accordion */}
      <DataAccordion items={accordionItems} />
    </div>
  );
}