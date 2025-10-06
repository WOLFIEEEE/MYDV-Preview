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
  Trash2, 
  Edit3,
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
    name: 'AutoTrader',
    description: 'UK\'s largest automotive marketplace',
    icon: <Car className="h-5 w-5" />,
    color: 'bg-blue-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/autotrader'
  },
  {
    id: 'retailerWebsite',
    name: 'Retailer Website',
    description: 'Your dealership website',
    icon: <Globe className="h-5 w-5" />,
    color: 'bg-green-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/retailer-website'
  },
  {
    id: 'thirdParties',
    name: 'Third Parties',
    description: 'External partner platforms',
    icon: <Monitor className="h-5 w-5" />,
    color: 'bg-purple-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/third-parties'
  },
  {
    id: 'retailerStore',
    name: 'Retailer Store',
    description: 'AutoTrader store page',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'bg-orange-500',
    isActive: true,
    isBuiltIn: true,
    apiEndpoint: '/api/channels/retailer-store'
  }
];

const FUTURE_CHANNELS: Omit<Channel, 'isActive' | 'isBuiltIn'>[] = [
  {
    id: 'motors',
    name: 'Motors.co.uk',
    description: 'Popular UK automotive platform',
    icon: <Car className="h-5 w-5" />,
    color: 'bg-red-500',
    apiEndpoint: '/api/channels/motors'
  },
  {
    id: 'carGurus',
    name: 'CarGurus',
    description: 'International car marketplace',
    icon: <Globe className="h-5 w-5" />,
    color: 'bg-indigo-500',
    apiEndpoint: '/api/channels/cargurus'
  },
  {
    id: 'facebook',
    name: 'Facebook Marketplace',
    description: 'Social media marketplace',
    icon: <Smartphone className="h-5 w-5" />,
    color: 'bg-blue-600',
    apiEndpoint: '/api/channels/facebook'
  },
  {
    id: 'pistonheads',
    name: 'PistonHeads',
    description: 'Enthusiast automotive community',
    icon: <Car className="h-5 w-5" />,
    color: 'bg-gray-700',
    apiEndpoint: '/api/channels/pistonheads'
  }
];

interface ChannelManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChannelManagement({ isOpen, onClose }: ChannelManagementProps) {
  const { isDarkMode } = useTheme();
  const [channels, setChannels] = useState<Channel[]>(BUILT_IN_CHANNELS);
  const [showAddChannel, setShowAddChannel] = useState(false);

  if (!isOpen) return null;

  const handleToggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, isActive: !channel.isActive }
        : channel
    ));
  };

  const handleAddChannel = (futureChannel: typeof FUTURE_CHANNELS[0]) => {
    const newChannel: Channel = {
      ...futureChannel,
      isActive: false,
      isBuiltIn: false
    };
    
    setChannels(prev => [...prev, newChannel]);
    setShowAddChannel(false);
  };

  const handleRemoveChannel = (channelId: string) => {
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
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
                        {!channel.isBuiltIn && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveChannel(channel.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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

          {/* Add New Channel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Available Channels
              </h3>
              <Button
                onClick={() => setShowAddChannel(!showAddChannel)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Channel
              </Button>
            </div>

            {showAddChannel && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {FUTURE_CHANNELS.filter(futureChannel => 
                  !channels.some(channel => channel.id === futureChannel.id)
                ).map(futureChannel => (
                  <Card key={futureChannel.id} className={`${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                  } border-dashed`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${futureChannel.color} text-white opacity-70`}>
                            {futureChannel.icon}
                          </div>
                          <div>
                            <CardTitle className={`text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {futureChannel.name}
                            </CardTitle>
                            <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                              {futureChannel.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddChannel(futureChannel)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <span className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                        Coming Soon
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className={`p-4 rounded-lg border-2 border-dashed ${
              isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'
            }`}>
              <div className="text-center">
                <Plus className={`h-8 w-8 mx-auto mb-2 ${isDarkMode ? 'text-white' : 'text-gray-500'}`} />
                <h4 className={`font-medium mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Custom Channel Integration
                </h4>
                <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-600'}`}>
                  Need a custom channel? Contact support for integration assistance.
                </p>
                <Button variant="outline" className="mt-3">
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
