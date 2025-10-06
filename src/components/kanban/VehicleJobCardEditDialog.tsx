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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Car, 
  Wrench, 
  Clock, 
  PoundSterling, 
  AlertTriangle,
  Trash2,
  Loader2,
  User,
  Calendar,
  Plus,
  Download
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import type { VehicleJobCard } from "@/db/schema";

interface JobCategory {
  value: string;
  label: string;
  group: string;
  category?: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: 'owner' | 'team_member';
}

interface VehicleJobCardEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: VehicleJobCard | null;
  onUpdateJob: (jobData: {
    jobType: string;
    garageDetails: string;
    jobCategory: string;
    estimatedHours?: number;
    totalCost?: number;
    priority?: string;
    assignedTo?: string;
    dueDate?: string;
    jobs?: Array<{
      jobCategory: string;
      jobType: string;
      estimatedHours?: number;
      totalCost?: number;
    }>;
  }) => void;
  onDeleteJob: (job: VehicleJobCard) => void;
  jobCategories: JobCategory[];
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

export default function VehicleJobCardEditDialog({
  open,
  onOpenChange,
  job,
  onUpdateJob,
  onDeleteJob,
  jobCategories
}: VehicleJobCardEditDialogProps) {
  const { isDarkMode } = useTheme();
  
  const [formData, setFormData] = useState({
    garageDetails: '',
    priority: 'medium',
    assignedTo: 'unassigned',
    dueDate: ''
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

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
    setJobs([newJob, ...jobs]); // Add new jobs at the top for consistency
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

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setFormData({
        garageDetails: job.garageDetails || '',
        priority: job.priority || 'medium',
        assignedTo: job.assignedTo || 'unassigned',
        dueDate: job.dueDate ? new Date(job.dueDate).toISOString().split('T')[0] : ''
      });

      // Initialize jobs array
      if (job.jobs && Array.isArray(job.jobs) && job.jobs.length > 0) {
        // Multiple jobs exist - these are existing/saved jobs
        setJobs(job.jobs.map((individualJob: any, index: number) => ({
          id: `job-${index}`,
          jobCategory: individualJob.jobCategory || '',
          jobType: individualJob.jobType || '',
          estimatedHours: individualJob.estimatedHours?.toString() || '',
          totalCost: individualJob.totalCost?.toString() || '',
          isNew: false, // Existing jobs from database
        })));
      } else {
        // Single job - convert to jobs array format - this is an existing job
        setJobs([{
          id: 'job-0',
          jobCategory: job.jobCategory || '',
          jobType: job.jobType || '',
          estimatedHours: job.estimatedHours?.toString() || '',
          totalCost: job.estimatedCost || '',
          isNew: false, // Existing job from database
        }]);
      }
    }
  }, [job]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all jobs have required fields
    const hasValidJobs = jobs.length > 0 && jobs.every(job => 
      job.jobCategory.trim() && job.jobType.trim()
    );
    
    if (!hasValidJobs) {
      return;
    }

    setIsUpdating(true);
    
    try {
      // Calculate total cost and hours across all jobs
      const totalCost = jobs.reduce((sum, job) => {
        return sum + (job.totalCost ? parseFloat(job.totalCost) : 0);
      }, 0);

      const totalHours = jobs.reduce((sum, job) => {
        return sum + (job.estimatedHours ? parseFloat(job.estimatedHours) : 0);
      }, 0);

      // Create combined job type description
      const combinedJobType = jobs.map(job => job.jobType).join(', ');
      
      // Use the first job's category as main category, or 'multiple_jobs' if different categories
      const categories = [...new Set(jobs.map(job => job.jobCategory))];
      const mainJobCategory = categories.length === 1 ? categories[0] : 'multiple_jobs';

      await onUpdateJob({
        jobType: combinedJobType,
        garageDetails: formData.garageDetails.trim(),
        jobCategory: mainJobCategory,
        estimatedHours: totalHours > 0 ? totalHours : undefined,
        totalCost: totalCost > 0 ? totalCost : undefined,
        priority: formData.priority,
        assignedTo: formData.assignedTo === 'unassigned' ? undefined : formData.assignedTo,
        dueDate: formData.dueDate || undefined,
        jobs: jobs.map(job => ({
          jobCategory: job.jobCategory,
          jobType: job.jobType,
          estimatedHours: job.estimatedHours ? parseFloat(job.estimatedHours) : undefined,
          totalCost: job.totalCost ? parseFloat(job.totalCost) : undefined,
        })),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle delete
  const handleDelete = () => {
    if (job) {
      onDeleteJob(job);
      onOpenChange(false);
    }
  };

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!job) return;

    setIsGeneratingPDF(true);
    try {
      // Get assigned user name
      const assignedUserName = job.assignedTo 
        ? teamMembers.find(m => m.id === job.assignedTo)?.name 
        : undefined;

      // Fetch vehicle details using the registration number
      let stockDetails = undefined;
      try {
        const vehicleResponse = await fetch(`/api/vehicles/${encodeURIComponent(job.registration)}`);
        if (vehicleResponse.ok) {
          const vehicleData = await vehicleResponse.json();
          if (vehicleData.success) {
            stockDetails = vehicleData.data;
            console.log('✅ Fetched vehicle details:', stockDetails);
          }
        }
      } catch (error) {
        console.warn('Could not fetch vehicle details:', error);
      }

      // Prepare job card data for server-side PDF generation
      const jobCardData = {
        ...job,
        assignedUserName,
        stockDetails,
        // Don't include dummy company info - let server fetch real data
        companyInfo: undefined
      };

      console.log('📋 Generating job card PDF via server API...');

      // Generate PDF using server-side API (similar to invoice approach)
      const response = await fetch('/api/job-card-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobCardData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Get filename from response headers or create one
        let filename = `JobCard_${job.registration}_${job.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
        const contentDisposition = response.headers.get('Content-Disposition');
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        // Download the PDF
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        URL.revokeObjectURL(url);
        
        console.log('✅ Job card PDF downloaded successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error generating job card PDF:', error);
      alert(`❌ Failed to generate job card PDF\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again.`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Group job categories for display
  const groupedCategories = jobCategories.reduce((acc, category) => {
    if (!acc[category.group]) {
      acc[category.group] = [];
    }
    acc[category.group].push(category);
    return acc;
  }, {} as Record<string, JobCategory[]>);

  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'exVat': return 'Ex VAT Costs';
      case 'incVat': return 'Inc VAT Costs';
      default: return group;
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[600px] max-h-[90vh] flex flex-col ${
        isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className={`flex items-center gap-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Wrench className="w-5 h-5 text-blue-500" />
            Edit Job Card
          </DialogTitle>
          <DialogDescription className={`${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Update the job card details below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <form onSubmit={handleSubmit} className="space-y-3 pb-4">
          {/* Vehicle Registration (Read-only) */}
          <div className="space-y-2">
            <Label className={`text-sm font-medium flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              <Car className="w-4 h-4 text-blue-500" />
              Vehicle Registration
            </Label>
            <div className={`px-3 py-2 rounded-md border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-gray-300' 
                : 'bg-gray-50 border-gray-300 text-gray-600'
            }`}>
              {job.registration}
            </div>
          </div>

          {/* Jobs Section */}
          <div className={`space-y-3 p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                <Wrench className="w-4 h-4" />
                Job Information ({jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addJob}
                className={`flex items-center gap-1 ${
                  isDarkMode 
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-3 h-3" />
                Add Job
              </Button>
            </div>
            
            {jobs.map((job, index) => (
              <div key={job.id} className={`space-y-3 p-3 rounded-lg border ${
                job.isNew 
                  ? (isDarkMode 
                      ? 'bg-blue-900/30 border-blue-600/50' // Dark mode: darker blue for new jobs
                      : 'bg-blue-50 border-blue-200') // Light mode: light blue for new jobs
                  : (isDarkMode 
                      ? 'bg-gray-700 border-gray-600' // Dark mode: existing styling for saved jobs
                      : 'bg-gray-100 border-gray-300') // Light mode: light grey for saved jobs
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-700'
                  }`}>
                    Job {jobs.length - index}
                  </span>
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
                    <Label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Job Category *
                    </Label>
                    <Select 
                      value={job.jobCategory} 
                      onValueChange={(value) => updateJob(job.id, 'jobCategory', value)}
                    >
                      <SelectTrigger className={`${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}>
                        <SelectValue placeholder="Select job category" />
                      </SelectTrigger>
                      <SelectContent className={`${
                        isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        {Object.entries(groupedCategories).map(([group, categories]) => (
                          <div key={group}>
                            <div className={`px-2 py-1 text-xs font-semibold ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {getGroupLabel(group)}
                            </div>
                            {categories.map((category) => (
                              <SelectItem 
                                key={category.value} 
                                value={category.value}
                                className={`${
                                  isDarkMode 
                                    ? 'text-white hover:bg-gray-700' 
                                    : 'text-gray-900 hover:bg-gray-100'
                                }`}
                              >
                                {category.label}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Job Type */}
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      Job Details *
                    </Label>
                    <Input
                      placeholder="e.g., Oil Change, Brake Repair"
                      value={job.jobType}
                      onChange={(e) => updateJob(job.id, 'jobType', e.target.value)}
                      className={`${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
                      }`}
                      required
                    />
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Type of work being carried out
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Estimated Hours */}
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium flex items-center gap-1 ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
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
                      className={`${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
                      }`}
                    />
                  </div>

                  {/* Total Cost */}
                  <div className="space-y-2">
                    <Label className={`text-sm font-medium flex items-center gap-1 ${
                      isDarkMode ? 'text-white' : 'text-gray-700'
                    }`}>
                      <PoundSterling className="w-3 h-3" />
                      Cost (£)
                    </Label>
                    <Input
                      type="number"
                      placeholder="e.g., 150.00"
                      min="0"
                      value={job.totalCost}
                      onChange={(e) => updateJob(job.id, 'totalCost', e.target.value)}
                      className={`${
                        isDarkMode 
                          ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="garageDetails" className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Additional Notes
            </Label>
            <Textarea
              id="garageDetails"
              value={formData.garageDetails}
              onChange={(e) => handleInputChange('garageDetails', e.target.value)}
              placeholder="Any additional notes or special instructions..."
              className={`${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
              }`}
              rows={3}
            />
          </div>

          {/* Assignment */}
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className={`text-sm font-medium flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              <User className="w-4 h-4" />
              Assign To
            </Label>
            <Select 
              value={formData.assignedTo} 
              onValueChange={(value) => handleInputChange('assignedTo', value)}
            >
              <SelectTrigger className={`${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}>
                <SelectValue placeholder={loadingMembers ? "Loading..." : "Select assignee (optional)"} />
              </SelectTrigger>
              <SelectContent className={`${
                isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
              }`}>
                <SelectItem value="unassigned">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Unassigned</span>
                  </div>
                </SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem 
                    key={member.id} 
                    value={member.id}
                    className={`${
                      isDarkMode 
                        ? 'text-white hover:bg-gray-700' 
                        : 'text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        member.type === 'owner' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      <span className="font-medium">{member.name}</span>
                      <span className={`text-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
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
            <Label htmlFor="dueDate" className={`text-sm font-medium flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              <Calendar className="w-4 h-4" />
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleInputChange('dueDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]} // Prevent past dates
              className={`${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>

          {/* Garage Details */}
          <div className="space-y-2">
            <Label htmlFor="garageDetails" className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Garage Details
            </Label>
            <Textarea
              id="garageDetails"
              value={formData.garageDetails}
              onChange={(e) => handleInputChange('garageDetails', e.target.value)}
              placeholder="Detailed description of work to be performed..."
              rows={3}
              className={`resize-none ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500'
              }`}
            />
          </div>


          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <Label className={`text-sm font-medium ${
              isDarkMode ? 'text-white' : 'text-gray-700'
            }`}>
              Status:
            </Label>
            <Badge variant="outline" className="capitalize">
              {job.status.replace('_', ' ')}
            </Badge>
            {job.costsSubmitted && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Costs Submitted
              </Badge>
            )}
          </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download PDF
                </>
              )}
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={!jobs.every(job => job.jobCategory.trim() && job.jobType.trim()) || isUpdating}
              className="w-full sm:w-auto"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Job Card'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
