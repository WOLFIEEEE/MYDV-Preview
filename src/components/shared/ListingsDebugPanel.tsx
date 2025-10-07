"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bug, AlertTriangle, CheckCircle } from 'lucide-react';
import type { StockItem } from '@/types/stock';

interface ListingsDebugPanelProps {
  stockData: StockItem[] | null;
  loading: boolean;
  error: string | null;
  isSignedIn: boolean;
  isLoaded: boolean;
  channelStatus: { [vehicleId: string]: { [channelId: string]: boolean } };
}

export function ListingsDebugPanel({ 
  stockData, 
  loading, 
  error, 
  isSignedIn, 
  isLoaded, 
  channelStatus 
}: ListingsDebugPanelProps) {

  const getStatusBadge = (condition: boolean, trueText: string, falseText: string) => {
    return (
      <Badge variant={condition ? "default" : "destructive"}>
        {condition ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
        {condition ? trueText : falseText}
      </Badge>
    );
  };

  const analyzeStockData = () => {
    if (!stockData) return null;

    const analysis = {
      totalVehicles: stockData.length,
      vehiclesWithMake: stockData.filter(v => v.make || v.vehicle?.make).length,
      vehiclesWithModel: stockData.filter(v => v.model || v.vehicle?.model).length,
      vehiclesWithRegistration: stockData.filter(v => v.registration || v.vehicle?.registration).length,
      vehiclesWithPrice: stockData.filter(v => v.forecourtPrice || v.totalPrice || v.adverts?.retailAdverts?.forecourtPrice?.amountGBP || v.adverts?.retailAdverts?.totalPrice?.amountGBP).length,
      vehiclesWithLifecycleState: stockData.filter(v => v.lifecycleState || v.metadata?.lifecycleState).length,
      forecourtVehicles: stockData.filter(v => {
        const lifecycleState = v.lifecycleState || v.metadata?.lifecycleState;
        return lifecycleState?.toLowerCase() === 'forecourt';
      }).length,
      vehiclesWithAdverts: stockData.filter(v => v.adverts || v.advertStatus).length,
      vehiclesWithMedia: stockData.filter(v => v.media).length,
    };

    return analysis;
  };

  const analysis = analyzeStockData();

  return (
    <Card className="mb-6 border-orange-200 bg-orange-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-4">
          <Bug className="w-4 h-4 text-orange-600" />
          <CardTitle className="text-lg text-orange-800">Listings Debug Panel</CardTitle>
          <Badge variant="outline" className="ml-auto">
            ?debug=true
          </Badge>
        </div>
        
        <Accordion type="multiple" className="space-y-4">
          <AccordionItem value="auth">
            <AccordionTrigger className="text-sm font-medium">
              Authentication Status
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">User Loaded:</span>
                {getStatusBadge(isLoaded, "Loaded", "Not Loaded")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">User Signed In:</span>
                {getStatusBadge(isSignedIn, "Signed In", "Not Signed In")}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fetching">
            <AccordionTrigger className="text-sm font-medium">
              Data Fetching Status
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">Loading:</span>
                {getStatusBadge(loading, "Loading", "Not Loading")}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Error:</span>
                {error ? (
                  <Badge variant="destructive">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {error}
                  </Badge>
                ) : (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    No Error
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Stock Data:</span>
                {getStatusBadge(!!stockData, "Available", "Not Available")}
              </div>
            </AccordionContent>
          </AccordionItem>

          {analysis && (
            <AccordionItem value="analysis">
              <AccordionTrigger className="text-sm font-medium">
                Stock Data Analysis
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Vehicles: <strong>{analysis.totalVehicles}</strong></div>
                  <div>Forecourt Vehicles: <strong>{analysis.forecourtVehicles}</strong></div>
                  <div>With Make: <strong>{analysis.vehiclesWithMake}</strong></div>
                  <div>With Model: <strong>{analysis.vehiclesWithModel}</strong></div>
                  <div>With Registration: <strong>{analysis.vehiclesWithRegistration}</strong></div>
                  <div>With Price: <strong>{analysis.vehiclesWithPrice}</strong></div>
                  <div>With Lifecycle State: <strong>{analysis.vehiclesWithLifecycleState}</strong></div>
                  <div>With Adverts: <strong>{analysis.vehiclesWithAdverts}</strong></div>
                  <div>With Media: <strong>{analysis.vehiclesWithMedia}</strong></div>
                </div>
                
                {/* Data Quality Issues */}
                <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                  <h4 className="font-medium text-yellow-800 mb-2">Potential Issues:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {analysis.totalVehicles === 0 && (
                      <li>• No vehicles found in stock data</li>
                    )}
                    {analysis.forecourtVehicles === 0 && analysis.totalVehicles > 0 && (
                      <li>• No vehicles with 'FORECOURT' lifecycle state</li>
                    )}
                    {analysis.vehiclesWithMake < analysis.totalVehicles && (
                      <li>• {analysis.totalVehicles - analysis.vehiclesWithMake} vehicles missing make</li>
                    )}
                    {analysis.vehiclesWithModel < analysis.totalVehicles && (
                      <li>• {analysis.totalVehicles - analysis.vehiclesWithModel} vehicles missing model</li>
                    )}
                    {analysis.vehiclesWithRegistration < analysis.totalVehicles && (
                      <li>• {analysis.totalVehicles - analysis.vehiclesWithRegistration} vehicles missing registration</li>
                    )}
                    {analysis.vehiclesWithPrice < analysis.totalVehicles && (
                      <li>• {analysis.totalVehicles - analysis.vehiclesWithPrice} vehicles missing price</li>
                    )}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          <AccordionItem value="channels">
            <AccordionTrigger className="text-sm font-medium">
              Channel Status Analysis
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="text-sm">
                Vehicles with channel status: <strong>{Object.keys(channelStatus).length}</strong>
              </div>
              
              {Object.keys(channelStatus).length > 0 && (
                <div className="mt-2 space-y-1">
                  <h4 className="font-medium text-sm">Channel Status Summary:</h4>
                  {['autotrader', 'advertiser', 'locator', 'export', 'profile'].map(channel => {
                    const activeCount = Object.values(channelStatus).filter(
                      status => status[channel] === true
                    ).length;
                    const totalCount = Object.keys(channelStatus).length;
                    return (
                      <div key={channel} className="text-sm flex items-center gap-2">
                        <span className="w-20 capitalize">{channel}:</span>
                        <Badge variant={activeCount > 0 ? "default" : "secondary"}>
                          {activeCount}/{totalCount}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="console">
            <AccordionTrigger className="text-sm font-medium">
              Console Logging
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="text-sm text-gray-600">
                <p className="mb-2">Check browser console for detailed logging:</p>
                <ul className="space-y-1 text-xs">
                  <li>• <strong>LISTINGS PAGE DATA STATE</strong> - Overall data status</li>
                  <li>• <strong>LISTINGS: FILTERING DATA</strong> - Filtering process</li>
                  <li>• <strong>LISTINGS: FIRST VEHICLE ANALYSIS</strong> - Sample vehicle data</li>
                  <li>• <strong>REACT QUERY: FETCHING STOCK DATA</strong> - API requests</li>
                  <li>• <strong>STOCK API: SUCCESS RESPONSE</strong> - API response details</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardHeader>
    </Card>
  );
}
