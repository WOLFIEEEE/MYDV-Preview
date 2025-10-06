"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Wrench, Clock, PoundSterling, AlertTriangle, User, Calendar, Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobCategory {
  value: string;
  label: string;
  group?: string;
  category?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: 'owner' | 'team_member';
}

interface VehicleJobCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddJob: (jobData: {
    stockId: string; // Actual stock ID
    vehicleRegistration: string;
    garageDetails: string;
    jobCategory: string;
    jobType: string;
    estimatedHours?: number;
    totalCost?: number;
    assignedTo?: string;
    dueDate?: string;
    jobs?: Array<{
      jobCategory: string;
      jobType: string;
      estimatedHours?: number;
      totalCost?: number;
    }>;
  }) => void;
  columnName?: string;
  jobCategories: JobCategory[];
}

export default function VehicleJobCardDialog({ 
  open, 
  onOpenChange, 
  onAddJob, 
  columnName,
  jobCategories
}: VehicleJobCardDialogProps) {
  const [formData, setFormData] = useState({
    vehicleRegistration: '',
    garageDetails: '',
    assignedTo: 'unassigned',
    dueDate: '',
  });

  // Structure for individual jobs
  interface JobItem {
    id: string;
    jobCategory: string;
    jobType: string;
    estimatedHours: string;
    totalCost: string;
    isNew?: boolean; // Track if this is a newly added job
  }

  const [jobs, setJobs] = useState<JobItem[]>([
    {
      id: '1',
      jobCategory: '',
      jobType: '',
      estimatedHours: '',
      totalCost: '',
      isNew: true, // Initial job is always new
    }
  ]);

  const [vehicleValidation, setVehicleValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
    stockId?: string; // Store the actual stock ID
  }>({
    isValid: false,
    isChecking: false,
    message: ''
  });

  const [vehicleSuggestions, setVehicleSuggestions] = useState<Array<{
    stockId: string;
    registration: string;
    make: string;
    model: string;
    yearOfManufacture?: number;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Functions to manage jobs
  const addJob = () => {
    const newJob: JobItem = {
      id: Date.now().toString(),
      jobCategory: '',
      jobType: '',
      estimatedHours: '',
      totalCost: '',
      isNew: true, // Mark newly added jobs as new
    };
    setJobs([newJob, ...jobs]);
  };

  const removeJob = (jobId: string) => {
    if (jobs.length > 1) {
      setJobs(jobs.filter(job => job.id !== jobId));
    }
  };

  const updateJob = (jobId: string, field: keyof Omit<JobItem, 'id'>, value: string) => {
    setJobs(jobs.map(job => 
      job.id === jobId ? { ...job, [field]: value } : job
    ));
  };

  // Fetch team members when dialog opens
  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    setLoadingMembers(true);
    try {
      const response = await fetch('/api/team-members');
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          // Deduplicate team members by ID to prevent React key conflicts
          const uniqueMembers = (result.data || []).filter((member: TeamMember, index: number, array: TeamMember[]) => 
            array.findIndex(m => m.id === member.id) === index
          );
          setTeamMembers(uniqueMembers);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Search for vehicle suggestions as user types
  const searchVehicleSuggestions = async (registration: string) => {
    if (!registration.trim() || registration.length < 2) {
      setVehicleSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Search for partial matches
      const response = await fetch(`/api/inventory/search?registration=${encodeURIComponent(registration)}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setVehicleSuggestions(result.data.slice(0, 5)); // Limit to 5 suggestions
        setShowSuggestions(true);
      } else {
        setVehicleSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching vehicles:', error);
      setVehicleSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Validate vehicle registration against inventory
  const validateVehicleRegistration = async (registration: string) => {
    if (!registration.trim()) {
      setVehicleValidation({
        isValid: false,
        isChecking: false,
        message: ''
      });
      setShowSuggestions(false);
      return;
    }

    // Remove spaces and convert to uppercase
    const cleanReg = registration.replace(/\s+/g, '').toUpperCase();
    
    setVehicleValidation({
      isValid: false,
      isChecking: true,
      message: 'Checking vehicle inventory...'
    });

    try {
      // Check for exact match
      const response = await fetch(`/api/inventory/search?registration=${encodeURIComponent(cleanReg)}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Find exact match
        const exactMatch = result.data.find((vehicle: any) => 
          vehicle.registration?.toUpperCase() === cleanReg
        );

        if (exactMatch) {
          setVehicleValidation({
            isValid: true,
            isChecking: false,
            message: `Vehicle found: ${exactMatch.make} ${exactMatch.model}`,
            stockId: exactMatch.stockId // Store the actual stock ID
          });
          // Update the form with clean registration
          setFormData(prev => ({ ...prev, vehicleRegistration: cleanReg }));
          setShowSuggestions(false);
        } else {
          setVehicleValidation({
            isValid: false,
            isChecking: false,
            message: 'This vehicle is not in your vehicle inventory. Please add to inventory before adding job card details.'
          });
        }
      } else {
        setVehicleValidation({
          isValid: false,
          isChecking: false,
          message: 'This vehicle is not in your vehicle inventory. Please add to inventory before adding job card details.'
        });
      }
    } catch (error) {
      console.error('Error validating vehicle registration:', error);
      setVehicleValidation({
        isValid: false,
        isChecking: false,
        message: 'Error checking vehicle inventory. Please try again.'
      });
    }
  };

  // Handle registration input change with debounce
  useEffect(() => {
    const searchTimeoutId = setTimeout(() => {
      if (formData.vehicleRegistration && formData.vehicleRegistration.length >= 2) {
        searchVehicleSuggestions(formData.vehicleRegistration);
      } else {
        setVehicleSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // Faster for search suggestions

    const validateTimeoutId = setTimeout(() => {
      if (formData.vehicleRegistration) {
        validateVehicleRegistration(formData.vehicleRegistration);
      }
    }, 800); // Slower for validation to avoid too many API calls

    return () => {
      clearTimeout(searchTimeoutId);
      clearTimeout(validateTimeoutId);
    };
  }, [formData.vehicleRegistration]);

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: typeof vehicleSuggestions[0]) => {
    setFormData(prev => ({ ...prev, vehicleRegistration: suggestion.registration }));
    setVehicleValidation({
      isValid: true,
      isChecking: false,
      message: `Vehicle found: ${suggestion.make} ${suggestion.model}`,
      stockId: suggestion.stockId // Store the actual stock ID
    });
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      return;
    }

    // Calculate total cost across all jobs
    const totalCost = jobs.reduce((sum, job) => {
      return sum + (job.totalCost ? parseFloat(job.totalCost) : 0);
    }, 0);

    // Calculate total estimated hours across all jobs
    const totalHours = jobs.reduce((sum, job) => {
      return sum + (job.estimatedHours ? parseFloat(job.estimatedHours) : 0);
    }, 0);

    // Create a combined job type description
    const combinedJobType = jobs.map(job => job.jobType).join(', ');
    
    // Use the first job's category as the main category, or create a combined description
    const mainJobCategory = jobs.length === 1 ? jobs[0].jobCategory : 'multiple_jobs';

    onAddJob({
      stockId: vehicleValidation.stockId!, // Pass the actual stock ID
      vehicleRegistration: formData.vehicleRegistration.replace(/\s+/g, '').toUpperCase(),
      garageDetails: formData.garageDetails.trim(),
      jobCategory: mainJobCategory,
      jobType: combinedJobType,
      estimatedHours: totalHours > 0 ? totalHours : undefined,
      totalCost: totalCost > 0 ? totalCost : undefined,
      assignedTo: formData.assignedTo === 'unassigned' ? undefined : formData.assignedTo,
      dueDate: formData.dueDate || undefined,
      jobs: jobs.map(job => ({
        jobCategory: job.jobCategory,
        jobType: job.jobType,
        estimatedHours: job.estimatedHours ? parseFloat(job.estimatedHours) : undefined,
        totalCost: job.totalCost ? parseFloat(job.totalCost) : undefined,
      })),
    });

    // Reset form
      setFormData({
        vehicleRegistration: '',
        garageDetails: '',
        assignedTo: 'unassigned',
        dueDate: '',
      });

    setJobs([
      {
        id: '1',
        jobCategory: '',
        jobType: '',
        estimatedHours: '',
        totalCost: '',
        isNew: true,
      }
    ]);

    setVehicleValidation({
      isValid: false,
      isChecking: false,
      message: ''
    });

    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
      setFormData({
        vehicleRegistration: '',
        garageDetails: '',
        assignedTo: 'unassigned',
        dueDate: '',
      });

    setJobs([
      {
        id: '1',
        jobCategory: '',
        jobType: '',
        estimatedHours: '',
        totalCost: '',
        isNew: true,
      }
    ]);

    setVehicleValidation({
      isValid: false,
      isChecking: false,
      message: ''
    });

    onOpenChange(false);
  };

  const isFormValid = () => {
    const hasValidVehicle = formData.vehicleRegistration.trim() && vehicleValidation.isValid && !vehicleValidation.isChecking;
    const hasValidJobs = jobs.length > 0 && jobs.every(job => 
      job.jobCategory.trim() && job.jobType.trim()
    );
    return hasValidVehicle && hasValidJobs;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Add Vehicle Job Card
          </DialogTitle>
          <DialogDescription>
            {columnName ? `Create a new job card in "${columnName}" column` : 'Create a new vehicle job card'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Information Section */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Vehicle Information
            </h3>
            
            {/* Vehicle Registration */}
            <div className="space-y-2 relative">
              <Label htmlFor="vehicleRegistration" className="flex items-center gap-1">
                <Car className="w-3 h-3" />
                Vehicle Registration *
              </Label>
            <div className="relative">
              <Input
                id="vehicleRegistration"
                placeholder="Start typing vehicle registration..."
                value={formData.vehicleRegistration}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setFormData({ ...formData, vehicleRegistration: value });
                }}
                onFocus={() => {
                  if (vehicleSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding suggestions to allow clicks
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                required
                autoFocus
                className={`${
                  vehicleValidation.isChecking 
                    ? 'border-yellow-300' 
                    : vehicleValidation.isValid 
                      ? 'border-green-300' 
                      : formData.vehicleRegistration && !vehicleValidation.isValid 
                        ? 'border-red-300' 
                        : ''
                }`}
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && vehicleSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {vehicleSuggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.stockId}-${index}`}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 px-2 py-1 rounded text-xs font-mono font-bold text-blue-800">
                            {suggestion.registration}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">
                              {suggestion.make} {suggestion.model}
                            </span>
                            {suggestion.yearOfManufacture && (
                              <span className="text-gray-500 ml-2">
                                ({suggestion.yearOfManufacture})
                              </span>
                            )}
                          </div>
                        </div>
                        <Car className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Vehicle Validation Message */}
            {vehicleValidation.message && (
              <Alert className={`${
                vehicleValidation.isValid 
                  ? 'border-green-200 bg-green-50' 
                  : vehicleValidation.isChecking
                    ? 'border-yellow-200 bg-yellow-50'
                    : 'border-red-200 bg-red-50'
              }`}>
                {vehicleValidation.isValid ? (
                  <Car className="h-4 w-4 text-green-600" />
                ) : vehicleValidation.isChecking ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={`${
                  vehicleValidation.isValid 
                    ? 'text-green-700' 
                    : vehicleValidation.isChecking
                      ? 'text-yellow-700'
                      : 'text-red-700'
                }`}>
                  {vehicleValidation.message}
                </AlertDescription>
              </Alert>
            )}
            </div>
          </div>

          {/* Jobs Section */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Job Information ({jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addJob}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Job
              </Button>
            </div>
            
            {jobs.map((job, index) => (
              <div key={job.id} className={`space-y-3 p-3 rounded-lg border ${
                job.isNew 
                  ? 'bg-blue-50 border-blue-200' // Light blue background for new jobs
                  : 'bg-gray-100 border-gray-300' // Light grey background for existing/saved jobs
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Job {jobs.length - index}</span>
                  {jobs.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeJob(job.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Job Category */}
                  <div className="space-y-2">
                    <Label>Job Category *</Label>
                    <Select 
                      value={job.jobCategory} 
                      onValueChange={(value) => updateJob(job.id, 'jobCategory', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select job category" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Ex VAT Costs */}
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Ex VAT Costs
                        </div>
                        {jobCategories.filter(cat => cat.group === 'exVat').map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                        
                        {/* Inc VAT Costs */}
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide mt-2">
                          Inc VAT Costs
                        </div>
                        {jobCategories.filter(cat => cat.group === 'incVat').map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Type */}
                  <div className="space-y-2">
                    <Label>Job Details *</Label>
                    <Input
                      placeholder="e.g., Oil Change, Brake Repair"
                      value={job.jobType}
                      onChange={(e) => updateJob(job.id, 'jobType', e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Type of work being carried out
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Estimated Hours */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Estimated Hours
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2"
                      min="0"
                      max="999"
                      value={job.estimatedHours}
                      onChange={(e) => updateJob(job.id, 'estimatedHours', e.target.value)}
                    />
                  </div>

                  {/* Total Cost */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <PoundSterling className="w-3 h-3" />
                      Cost (£)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 150.00"
                      min="0"
                      value={job.totalCost}
                      onChange={(e) => updateJob(job.id, 'totalCost', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Garage Details - moved here as it applies to all jobs */}
            <div className="space-y-2">
              <Label htmlFor="garageDetails">Additional Notes</Label>
              <textarea
                id="garageDetails"
                placeholder="Additional details about the work to be done..."
                value={formData.garageDetails}
                onChange={(e) => setFormData({ ...formData, garageDetails: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Assignment & Scheduling Section */}
          <div className="space-y-3 p-4 bg-purple-50 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Assignment & Scheduling
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assignment */}
              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Assign To
                </Label>
                <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMembers ? "Loading..." : "Select assignee (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                        Unassigned
                      </div>
                    </SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            member.type === 'owner' ? 'bg-blue-500' : 'bg-green-500'
                          }`}></div>
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({member.type === 'owner' ? 'Owner' : member.role})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                />
              </div>
            </div>
          </div>


          </form>
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={!isFormValid()}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            Create Job Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
