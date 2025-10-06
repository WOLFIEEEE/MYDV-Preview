"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Car } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import LicensePlate from "@/components/ui/license-plate";

interface VehicleDetailsProps {
  vehicleData: {
    registration: string;
    make: string;
    model: string;
    year: string;
    mileage: string;
    vehicleType?: string;
    bodyType?: string;
    color: string;
    vin?: string;
    engineSize: string;
    fuelType: string;
    transmissionType?: string;
    doors?: number;
    seats?: number;
    owners?: number;
    emissionClass?: string;
    enginePowerBHP?: number;
    co2Emissions: string;
    fuelEconomyCombinedMPG?: number;
  };
}

export default function VehicleDetails({ vehicleData }: VehicleDetailsProps) {
  const { isDarkMode } = useTheme();

  const vehicleFields = [
    { label: "Make", value: vehicleData.make },
    { label: "Model", value: vehicleData.model },
    { label: "Registration", value: vehicleData.registration, isLicensePlate: true },
    { label: "Year of Manufacture", value: vehicleData.year },
    { label: "Mileage", value: `${vehicleData.mileage} miles` },
    { label: "Vehicle Type", value: vehicleData.vehicleType || "Car" },
    { label: "Body Type", value: vehicleData.bodyType || "SUV" },
    { label: "Colour", value: vehicleData.color },
    { label: "Ownership Condition", value: "Used" },
    { label: "VIN", value: vehicleData.vin || "WAUZZZ4M6RD016057", mono: true },
    { label: "Engine Size in Litres", value: vehicleData.engineSize },
    { label: "Engine Capacity", value: "3996 cc" },
    { label: "Fuel Type", value: vehicleData.fuelType },
    { label: "Start Stop", value: "Yes" },
    { label: "Transmission Type", value: vehicleData.transmissionType || "Automatic" },
    { label: "Gears", value: "8" },
    { label: "Drivetrain", value: "Four Wheel Drive" },
    { label: "Seats", value: vehicleData.seats?.toString() || "7" },
    { label: "Doors", value: vehicleData.doors?.toString() || "5" },
    { label: "Cylinders", value: "8" },
    { label: "Emission Class", value: vehicleData.emissionClass || "Euro 6" },
    { label: "Owners", value: vehicleData.owners?.toString() || "2" },
    { label: "Drive Type", value: "4X4" },
    { label: "Engine Power (BHP)", value: vehicleData.enginePowerBHP?.toString() || "-" },
    { label: "CO2 Emissions", value: vehicleData.co2Emissions || "-" },
    { label: "Fuel Economy (MPG)", value: vehicleData.fuelEconomyCombinedMPG?.toString() || "-" }
  ];

  return (
    <Card className={`border shadow-xl rounded-2xl ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 border-slate-700' 
        : 'bg-gradient-to-br from-white via-slate-50 to-white border-slate-200'
    } transition-all duration-300`}>
      <CardContent className="p-8">
        {/* Vehicle Summary */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Car className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {vehicleData.year} {vehicleData.make} {vehicleData.model}
              </h2>
              <div className="flex items-center gap-4 mt-2">
                <LicensePlate 
                  registration={vehicleData.registration} 
                  size="sm" 
                />
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white">
                  <span>🛣️</span>
                  <span>{vehicleData.mileage} miles</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Notice */}
          <div className={`p-4 rounded-lg border ${
            isDarkMode 
              ? 'bg-blue-900/20 border-blue-700 text-blue-300' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-xs">i</span>
              </div>
              <span className="text-sm font-medium">
                Fields showing "-" indicate data not available from Autotrader or DVLA API.
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Information Grid */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Car className="w-5 h-5 text-blue-500" />
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Vehicle Information
            </h3>
          </div>
          
          <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-6">
            {vehicleFields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className={`block text-sm font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-700'
                }`}>
                  {field.label}
                </label>
                <div className={`font-semibold ${
                  field.mono ? 'font-mono text-sm' : ''
                } ${
                  field.value === '-' 
                    ? isDarkMode ? 'text-gray-500' : 'text-black' 
                    : isDarkMode ? 'text-white' : 'text-black'
                }`}>
                  {field.isLicensePlate ? (
                    <LicensePlate 
                      registration={field.value} 
                      size="sm" 
                    />
                  ) : (
                    field.value
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
