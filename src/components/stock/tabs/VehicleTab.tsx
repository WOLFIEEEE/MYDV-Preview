"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Car, Expand, Minimize } from "lucide-react";
import DataAccordion from "../shared/DataAccordion";
import DataGrid from "../shared/DataGrid";

interface VehicleTabProps {
  stockData: any;
  insideComponent?: boolean;
}

export default function VehicleTab({ stockData, insideComponent=false }: VehicleTabProps) {
  const vehicle = stockData.vehicle || {};
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);

  const basicInfoItems = [
    { label: 'Registration', value: vehicle.registration || vehicle.plate },
    { label: 'Make', value: vehicle.make },
    { label: 'Model', value: vehicle.model },
    { label: 'Derivative', value: vehicle.derivative },
    { label: 'Year of Manufacture', value: vehicle.yearOfManufacture },
    { label: 'Colour', value: vehicle.colour || (vehicle as any).standard?.colour },
    { label: 'Body Type', value: vehicle.bodyType },
    { label: 'Fuel Type', value: vehicle.fuelType },
    { label: 'Doors', value: vehicle.doors },
    { label: 'Seats', value: vehicle.seats },
  ];

  const technicalSpecItems = [
    { label: 'Engine Capacity (CC)', value: vehicle.engineCapacityCC },
    { label: 'Engine Power (BHP)', value: vehicle.enginePowerBHP },
    { label: 'Engine Power (PS)', value: vehicle.enginePowerPS },
    { label: 'Engine Torque (NM)', value: vehicle.engineTorqueNM },
    { label: 'Cylinders', value: vehicle.cylinders },
    { label: 'Valves', value: vehicle.valves },
    { label: 'Top Speed (MPH)', value: vehicle.topSpeedMPH },
    { label: '0-60 MPH (seconds)', value: vehicle.zeroToSixtyMPHSeconds },
    { label: 'Transmission Type', value: vehicle.transmissionType },
    { label: 'Drivetrain', value: vehicle.drivetrain },
  ];

  const dimensionsItems = [
    { label: 'Length (MM)', value: vehicle.lengthMM },
    { label: 'Width (MM)', value: vehicle.widthMM },
    { label: 'Height (MM)', value: vehicle.heightMM },
    { label: 'Wheelbase (MM)', value: vehicle.wheelbaseMM },
    { label: 'Minimum Kerb Weight (KG)', value: vehicle.minimumKerbWeightKG },
    { label: 'Boot Space Seats Up (Litres)', value: vehicle.bootSpaceSeatsUpLitres },
    { label: 'Boot Space Seats Down (Litres)', value: vehicle.bootSpaceSeatsDownLitres },
  ];

  const environmentalItems = [
    { label: 'CO2 Emissions (g/km)', value: vehicle.co2EmissionGPKM },
    { label: 'Emission Class', value: vehicle.emissionClass },
    { label: 'Fuel Economy Urban (MPG)', value: vehicle.fuelEconomyNEDCUrbanMPG },
    { label: 'Fuel Economy Extra Urban (MPG)', value: vehicle.fuelEconomyNEDCExtraUrbanMPG },
    { label: 'Fuel Economy Combined (MPG)', value: vehicle.fuelEconomyNEDCCombinedMPG },
    { label: 'WLTP Combined (MPG)', value: vehicle.fuelEconomyWLTPCombinedMPG },
    { label: 'Fuel Capacity (Litres)', value: vehicle.fuelCapacityLitres },
  ];

  const registrationItems = [
    { label: 'First Registration Date', value: vehicle.firstRegistrationDate, type: 'date' as const },
    { label: 'Plate', value: vehicle.plate },
    { label: 'VIN', value: vehicle.vin },
    { label: 'Engine Number', value: vehicle.engineNumber },
  ];

  const odometerItems = [
    { label: 'Odometer Reading (miles)', value: vehicle.odometerReadingMiles },
    { label: 'Hours Used', value: vehicle.hoursUsed },
  ];

  const ownershipItems = [
    { label: 'Ownership Condition', value: vehicle.ownershipCondition },
    { label: 'Previous Owners', value: vehicle.previousOwners },
    { label: 'Ex Demo', value: vehicle.exDemo, type: 'boolean' as const },
    { label: 'Keys', value: vehicle.keys },
    { label: 'V5 Certificate', value: vehicle.v5Certificate, type: 'boolean' as const },
    { label: 'Driver Position', value: vehicle.driverPosition },
  ];

  const serviceItems = [
    { label: 'MOT Expiry Date', value: vehicle.motExpiryDate, type: 'date' as const },
    { label: 'Last Service Date', value: vehicle.lastServiceDate, type: 'date' as const },
    { label: 'Last Service Odometer Reading', value: vehicle.lastServiceOdometerReadingMiles },
    { label: 'Warranty Months on Purchase', value: vehicle.warrantyMonthsOnPurchase },
    { label: 'Service History', value: vehicle.serviceHistory },
  ];

  const accordionItems = [
    {
      title: 'Basic Information',
      children: <DataGrid items={basicInfoItems} />,
      defaultOpen: true,
    },
    {
      title: 'Technical Specifications',
      children: <DataGrid items={technicalSpecItems} />,
    },
    {
      title: 'Dimensions & Weight',
      children: <DataGrid items={dimensionsItems} />,
    },
    {
      title: 'Environmental & Efficiency',
      children: <DataGrid items={environmentalItems} />,
    },
    {
      title: 'Registration Information',
      children: <DataGrid items={registrationItems} />,
    },
    {
      title: 'Odometer Information',
      children: <DataGrid items={odometerItems} />,
    },
    {
      title: 'Ownership & Documentation',
      children: <DataGrid items={ownershipItems} />,
    },
    {
      title: 'Service & Maintenance',
      children: <DataGrid items={serviceItems} />,
    },
  ];

  const handleExpandAll = () => {
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
  };

  const handleExpandAllChange = (expanded: boolean) => {
    // This callback is fired when individual items are toggled
    // and all items reach a uniform state (all expanded or all collapsed)
    setExpandAll(expanded);
  };

  return (
    <div className={`${insideComponent ? '' : 'px-4 sm:px-6 lg:px-8 py-8'} h-full`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Car className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Vehicle Details</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleExpandAll}>
            <Expand className="h-4 w-4 mr-1" />
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={handleCollapseAll}>
            <Minimize className="h-4 w-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Data Accordion */}
      <DataAccordion 
        items={accordionItems} 
        expandAll={expandAll}
        onExpandAllChange={handleExpandAllChange}
      />
    </div>
  );
}