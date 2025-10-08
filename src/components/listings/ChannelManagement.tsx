"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Settings, 
  Eye, 
  EyeOff,
  Globe,
  Car,
  Smartphone,
  Monitor
} from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isActive: boolean;
  isBuiltIn: boolean;
  apiEndpoint?: string;
  settings?: {
    [key: string]: any;
  };
}

const BUILT_IN_CHANNELS: Channel[] = [
  {
    id: 'autotrader',
    name: 'AT Search & Find',
    description: 'Your main advert shown on AutoTrader\'s website.',
    icon: <Car className="h-5 w-5" />,
    color: 'bg-blue-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/autotrader'
  },
  {
    id: 'profile',
    name: 'AT Dealer Page',
    description: 'Advert shown on your dealership\'s profile page within AutoTrader.',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'bg-orange-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/profile'
  },
  {
    id: 'advertiser',
    name: 'Dealer Website',
    description: 'Advert shown on your own dealer website (if set up with AutoTrader).',
    icon: <Globe className="h-5 w-5" />,
    color: 'bg-green-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/advertiser'
  },
  {
    id: 'export',
    name: 'AT Linked Advertisers',
    description: 'Advert sent to third-party sites or partners linked with AutoTrader.',
    icon: <Monitor className="h-5 w-5" />,
    color: 'bg-yellow-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/export'
  },
  {
    id: 'locator',
    name: 'Manufacturer Website / Used Vehicle Locators',
    description: 'Advert shown in AutoTrader\'s dealer search tool where buyers find dealers near them.',
    icon: <Car className="h-5 w-5" />,
    color: 'bg-purple-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/locator'
  }
];


interface ChannelManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChannelManagement({ isOpen, onClose }: ChannelManagementProps) {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<Channel[]>(BUILT_IN_CHANNELS);

  if (!isOpen) return null;

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, isActive: !channel.isActive }
        : channel
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Channel Management
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                Manage your advertising channels and their settings
              </p>
            </div>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>

          {/* Active Channels */}
          <div className="mb-8">
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Active Channels
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map(channel => (
                <Card key={channel.id} className={`${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${channel.color} text-white`}>
                          {channel.icon}
                        </div>
                        <div>
                          <CardTitle className={`text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {channel.name}
                          </CardTitle>
                          <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                            {channel.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleChannel(channel.id)}
                          className="h-8 w-8 p-0"
                        >
                          {channel.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm ${
                        channel.isActive 
                          ? 'text-green-600 font-medium' 
                          : isDarkMode ? 'text-white' : 'text-gray-500'
                      }`}>
                        {channel.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {channel.isBuiltIn && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          Built-in
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Channels Coming Soon */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Additional Channels
            </h3>
            
            <div className={`p-4 rounded-lg border-2 border-dashed ${
              isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="text-center">
                <Plus className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-white' : 'text-gray-500'}`} />
                <h4 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  More Channels Coming Soon
                </h4>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  We're working on integrating additional automotive platforms. Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
