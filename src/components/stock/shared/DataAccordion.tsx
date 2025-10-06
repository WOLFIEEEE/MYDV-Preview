"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, ChevronUp } from "lucide-react";

interface AccordionItem {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

interface DataAccordionProps {
  items: AccordionItem[];
}

export default function DataAccordion({ items }: DataAccordionProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(
    new Set(items.map((_, index) => items[index]?.defaultOpen ? index : -1).filter(i => i !== -1))
  );
  const { isDarkMode } = useTheme();

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className={`border rounded-lg ${
            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
          }`}
        >
          {/* Accordion Header */}
          <button
            onClick={() => toggleItem(index)}
            className={`w-full flex items-center justify-between p-4 text-left hover:bg-opacity-50 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
            }`}
          >
            <h3 className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {item.title}
            </h3>
            {openItems.has(index) ? (
              <ChevronUp className={`h-5 w-5 ${
                isDarkMode ? 'text-white' : 'text-gray-500'
              }`} />
            ) : (
              <ChevronDown className={`h-5 w-5 ${
                isDarkMode ? 'text-white' : 'text-gray-500'
              }`} />
            )}
          </button>

          {/* Accordion Content */}
          {openItems.has(index) && (
            <div className={`px-4 pb-4 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="pt-4">
                {item.children}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}