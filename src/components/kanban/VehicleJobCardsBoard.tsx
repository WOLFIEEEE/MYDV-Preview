"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus, 
  Clock, 
  Car,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUp,
  Loader2,
  RefreshCw,
  PoundSterling,
  Wrench
} from "lucide-react";
import { useUser } from '@clerk/nextjs';
import VehicleJobCardDialog from './VehicleJobCardDialog';
import VehicleJobCardEditDialog from './VehicleJobCardEditDialog';
import { useTheme } from "@/contexts/ThemeContext";
import { 
  useVehicleJobCards, 
  useCreateVehicleJobCard, 
  useUpdateVehicleJobCard, 
  useDeleteVehicleJobCard,
  vehicleJobCardsQueryKeys
} from "@/hooks/useVehicleJobCards";
import type { VehicleJobCard } from "@/db/schema";
import { useQueryClient } from '@tanstack/react-query';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  type: 'owner' | 'team_member';
}

// Define the job categories that map to cost types
const JOB_CATEGORIES = [
  // Ex VAT Costs
  { value: 'service_ex_vat', label: 'Service (Ex VAT)', group: 'exVat', category: 'service' },
  { value: 'parts_ex_vat', label: 'Parts (Ex VAT)', group: 'exVat', category: 'parts' },
  { value: 'repairs_ex_vat', label: 'Repairs (Ex VAT)', group: 'exVat', category: 'repairs' },
  { value: 'dents_ex_vat', label: 'Dent Repairs (Ex VAT)', group: 'exVat', category: 'dents' },
  { value: 'bodyshop_ex_vat', label: 'Bodyshop (Ex VAT)', group: 'exVat', category: 'bodyshop' },
  
  // Inc VAT Costs
  { value: 'service_inc_vat', label: 'Service (Inc VAT)', group: 'incVat', category: 'service' },
  { value: 'parts_inc_vat', label: 'Parts (Inc VAT)', group: 'incVat', category: 'parts' },
  { value: 'repairs_inc_vat', label: 'Repairs (Inc VAT)', group: 'incVat', category: 'repairs' },
  { value: 'dents_inc_vat', label: 'Dent Repairs (Inc VAT)', group: 'incVat', category: 'dents' },
  { value: 'bodyshop_inc_vat', label: 'Bodyshop (Inc VAT)', group: 'incVat', category: 'bodyshop' },
];

// Define the fixed columns for Vehicle Job Cards
const VEHICLE_JOB_COLUMNS = [
  { id: 'todo', name: 'To Do', color: '#ef4444' },
  { id: 'in_progress', name: 'In Progress', color: '#f59e0b' },
  { id: 'due_collection', name: 'Due Collection', color: '#8b5cf6' },
  { id: 'done', name: 'Done', color: '#10b981' },
];

export default function VehicleJobCardsBoard() {
  const { user } = useUser();
  const { isDarkMode } = useTheme();
  
  // State for dialogs and interactions
  const [showAddJobDialog, setShowAddJobDialog] = useState(false);
  const [showEditJobDialog, setShowEditJobDialog] = useState(false);
  const [selectedColumnStatus, setSelectedColumnStatus] = useState<string>('');
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');
  const [selectedJob, setSelectedJob] = useState<VehicleJobCard | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [jobToComplete, setJobToComplete] = useState<VehicleJobCard | null>(null);
  const [jobToDelete, setJobToDelete] = useState<VehicleJobCard | null>(null);
  const [areCostsSaved, setAreCostsSaved] = useState(false);
  
  // Loading states
  const [isCompletingJob, setIsCompletingJob] = useState(false);
  const [isDeletingJob, setIsDeletingJob] = useState(false);
  const [isSubmittingCosts, setIsSubmittingCosts] = useState(false);

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // React Query hooks
  const queryClient = useQueryClient();
  const { data: jobCards = [], isLoading, error, refetch, isFetching } = useVehicleJobCards();
  const createJobMutation = useCreateVehicleJobCard();
  const updateJobMutation = useUpdateVehicleJobCard();
  const deleteJobMutation = useDeleteVehicleJobCard();

  // Fetch team members when component mounts
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
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
    }
  };

  // Helper function to get assigned user name
  const getAssignedUserName = (assignedTo: string): string => {
    const member = teamMembers.find(m => m.id === assignedTo);
    return member ? member.name : 'Unknown User';
  };

  // Helper function to get assigned user initials
  const getAssignedUserInitials = (assignedTo: string): string => {
    const member = teamMembers.find(m => m.id === assignedTo);
    if (member) {
      return member.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    }
    return 'U';
  };

  // Check costs when completion or deletion dialog opens
  useEffect(() => {
    const checkCosts = async () => {
      if (showCompletionDialog && jobToComplete) {
        const costsSaved = await checkIfCostsSaved(jobToComplete);
        setAreCostsSaved(costsSaved);
      } else if (showDeletionDialog && jobToDelete) {
        const costsSaved = await checkIfCostsSaved(jobToDelete);
        setAreCostsSaved(costsSaved);
      }
    };
    
    checkCosts();
  }, [showCompletionDialog, jobToComplete, showDeletionDialog, jobToDelete]);

  // Group job cards by status
  const jobCardsByStatus = VEHICLE_JOB_COLUMNS.reduce((acc, column) => {
    acc[column.id] = jobCards.filter(job => job.status === column.id);
    return acc;
  }, {} as Record<string, VehicleJobCard[]>);

  // Handle drag and drop
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If dropped outside a droppable area or in the same position
    if (!destination || (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )) {
      return;
    }

    // Find the job card being moved
    const jobCard = jobCards.find(job => job.id === draggableId);
    if (!jobCard) return;

    const newStatus = destination.droppableId as 'todo' | 'in_progress' | 'due_collection' | 'done';

    // If moving to "Done", show completion dialog instead of immediate update
    if (newStatus === 'done') {
      setJobToComplete(jobCard);
      setShowCompletionDialog(true);
      return;
    }

    // Optimistically update the UI immediately
    const queryKey = vehicleJobCardsQueryKeys.list();
    const previousJobCards = queryClient.getQueryData<VehicleJobCard[]>(queryKey);
    
    if (previousJobCards) {
      // Update the job card status in the cache immediately
      const updatedJobCards = previousJobCards.map(job => 
        job.id === draggableId 
          ? { ...job, status: newStatus }
          : job
      );
      
      queryClient.setQueryData(queryKey, updatedJobCards);
    }

    // Update backend in the background
    try {
      await updateJobMutation.mutateAsync({
        id: jobCard.id,
        data: { status: newStatus }
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      
      // Revert the optimistic update on error
      if (previousJobCards) {
        queryClient.setQueryData(queryKey, previousJobCards);
      }
    }
  };

  // Handle adding a new job card
  const handleAddJob = async (jobData: { 
    stockId: string;
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
  }) => {
    try {
      // Default to store owner if no assignee is provided
      const finalAssignedTo = jobData.assignedTo || user?.id;
      
      // If jobs array is provided, create a single job card with multiple jobs
      if (jobData.jobs && jobData.jobs.length > 0) {
        // Calculate total cost and hours across all jobs
        const totalCost = jobData.jobs.reduce((sum, job) => {
          return sum + (job.totalCost || 0);
        }, 0);

        const totalHours = jobData.jobs.reduce((sum, job) => {
          return sum + (job.estimatedHours || 0);
        }, 0);

        // Create combined job type description
        const combinedJobType = jobData.jobs.map(job => job.jobType).join(', ');
        
        // Use the first job's category as main category, or 'multiple_jobs' if different categories
        const categories = [...new Set(jobData.jobs.map(job => job.jobCategory))];
        const mainJobCategory = categories.length === 1 ? categories[0] : 'multiple_jobs';

        // Create a single job card with jobs array
        await createJobMutation.mutateAsync({
          stockId: jobData.stockId,
          registration: jobData.vehicleRegistration,
          jobType: combinedJobType,
          garageDetails: jobData.garageDetails,
          jobCategory: mainJobCategory,
          status: selectedColumnStatus as 'todo' | 'in_progress' | 'due_collection' | 'done',
          estimatedHours: totalHours > 0 ? totalHours : undefined,
          estimatedCost: totalCost > 0 ? totalCost.toString() : null,
          costDescription: `Multiple jobs: ${combinedJobType}`,
          assignedTo: finalAssignedTo,
          dueDate: jobData.dueDate || undefined,
          jobs: jobData.jobs, // Store the jobs array in the database
        });
      } else {
        // Fallback to single job card (for backward compatibility)
        await createJobMutation.mutateAsync({
          stockId: jobData.stockId,
          registration: jobData.vehicleRegistration,
          jobType: jobData.jobType,
          garageDetails: jobData.garageDetails,
          jobCategory: jobData.jobCategory,
          status: selectedColumnStatus as 'todo' | 'in_progress' | 'due_collection' | 'done',
          estimatedHours: jobData.estimatedHours,
          estimatedCost: jobData.totalCost ? jobData.totalCost.toString() : null,
          costDescription: jobData.jobType,
          assignedTo: finalAssignedTo,
          dueDate: jobData.dueDate || undefined,
        });
      }
      
      setShowAddJobDialog(false);
    } catch (error) {
      console.error('Error adding job card:', error);
    }
  };

  // Handle editing a job card
  const handleEditJob = (job: VehicleJobCard) => {
    setSelectedJob(job);
    setShowEditJobDialog(true);
  };

  // Handle updating a job card
  const handleUpdateJob = async (jobData: {
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
  }) => {
    if (!selectedJob) return;

    try {
      await updateJobMutation.mutateAsync({
        id: selectedJob.id,
        data: {
          jobType: jobData.jobType,
          garageDetails: jobData.garageDetails,
          jobCategory: jobData.jobCategory,
          estimatedHours: jobData.estimatedHours,
          estimatedCost: jobData.totalCost ? jobData.totalCost.toString() : null,
          priority: jobData.priority as 'low' | 'medium' | 'high' | 'urgent',
          assignedTo: jobData.assignedTo,
          dueDate: jobData.dueDate || undefined,
          jobs: jobData.jobs || undefined,
        }
      });
      
      setShowEditJobDialog(false);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error updating job card:', error);
    }
  };

  // Check if costs are already saved for this specific job card
  const checkIfCostsSaved = async (job: VehicleJobCard): Promise<boolean> => {
    // Check the costsSubmitted field on the job card itself
    // This indicates whether THIS specific job's costs have been submitted
    return job.costsSubmitted || false;
  };

  // Handle job completion with cost submission
  const handleJobCompletion = async (submitToCosts: boolean) => {
    if (!jobToComplete) return;

    try {
      setIsCompletingJob(true);
      
      if (submitToCosts) {
        // Submit to costs system
        await submitJobToCosts(jobToComplete);
      }

      // Mark job as completed
      await updateJobMutation.mutateAsync({
        id: jobToComplete.id,
        data: { 
          status: 'done',
          costsSubmitted: submitToCosts
        }
      });

      setShowCompletionDialog(false);
      setJobToComplete(null);
    } catch (error) {
      console.error('Error completing job:', error);
    } finally {
      setIsCompletingJob(false);
    }
  };

  // Handle job deletion
  const handleJobDeletion = async (submitToCosts: boolean) => {
    if (!jobToDelete) return;

    try {
      setIsDeletingJob(true);
      
      if (submitToCosts) {
        setIsSubmittingCosts(true);
        await submitJobToCosts(jobToDelete);
        
        // Update the job card to mark costs as submitted before deletion
        await updateJobMutation.mutateAsync({
          id: jobToDelete.id,
          data: { 
            costsSubmitted: true
          }
        });
      }

      await deleteJobMutation.mutateAsync(jobToDelete.id);
      
      setShowDeletionDialog(false);
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job:', error);
    } finally {
      setIsDeletingJob(false);
      setIsSubmittingCosts(false);
    }
  };

  // Submit job costs to the vehicle costs system
  const submitJobToCosts = async (job: VehicleJobCard) => {
    // First, fetch existing costs to determine what's already been submitted
    const existingCostsResponse = await fetch(`/api/stock-actions/vehicle-costs?stockId=${job.stockId}`);
    const existingCostsData = existingCostsResponse.ok ? await existingCostsResponse.json() : null;
    const existingCosts = existingCostsData?.data;

    // Build the cost structure for the existing API
    const fixedCosts = {
      transportIn: '',
      transportOut: '',
      mot: ''
    };

    const groupedCosts = {
      exVat: {
        service: [] as Array<{ description: string; amount: string }>,
        parts: [] as Array<{ description: string; amount: string }>,
        repairs: [] as Array<{ description: string; amount: string }>,
        dents: [] as Array<{ description: string; amount: string }>,
        bodyshop: [] as Array<{ description: string; amount: string }>
      },
      incVat: {
        service: [] as Array<{ description: string; amount: string }>,
        parts: [] as Array<{ description: string; amount: string }>,
        repairs: [] as Array<{ description: string; amount: string }>,
        dents: [] as Array<{ description: string; amount: string }>,
        bodyshop: [] as Array<{ description: string; amount: string }>
      }
    };

    // Process individual jobs if they exist, otherwise process the main job
    const jobsToProcess = job.jobs && Array.isArray(job.jobs) && job.jobs.length > 0 
      ? job.jobs 
      : [{
          jobCategory: job.jobCategory,
          jobType: job.jobType,
          totalCost: parseFloat(job.estimatedCost || '0')
        }];

    // Helper function to check if a cost item already exists in existing costs
    const isJobAlreadySubmitted = (jobType: string, amount: number, category: string, group: 'exVat' | 'incVat' | 'fixed') => {
      if (!existingCosts) return false;

      if (group === 'fixed') {
        // For fixed costs, check if the exact amount exists
        const fixedCostMapping: Record<string, string> = {
          'transport_in': 'transportIn',
          'transport_out': 'transportOut',
          'mot': 'mot'
        };
        const fieldName = fixedCostMapping[category];
        if (fieldName && existingCosts[fieldName]) {
          const existingAmount = parseFloat(existingCosts[fieldName] || '0');
          return existingAmount >= amount; // If existing amount covers this job's cost
        }
      } else {
        // For grouped costs, check if exact job type and amount already exist
        const existingGroupCosts = existingCosts[`${group}Costs`];
        if (existingGroupCosts && existingGroupCosts[category]) {
          const categoryItems = existingGroupCosts[category];
          return categoryItems.some((item: any) => 
            item.description === jobType && parseFloat(item.amount) === amount
          );
        }
      }
      return false;
    };

    let hasNewCosts = false;

    // Process each job and only include NEW costs
    for (const individualJob of jobsToProcess) {
      const jobCategory = JOB_CATEGORIES.find(cat => cat.value === individualJob.jobCategory);
      if (!jobCategory) continue;

      const totalCost = individualJob.totalCost || 0;
      const costDescription = individualJob.jobType;

      if (totalCost <= 0) continue; // Skip jobs with no cost

      // Check if this specific job cost has already been submitted
      const alreadySubmitted = isJobAlreadySubmitted(
        costDescription, 
        totalCost, 
        jobCategory.value, 
        jobCategory.group as 'exVat' | 'incVat' | 'fixed'
      );

      if (alreadySubmitted) {
        console.log(`⏭️ Skipping already submitted job: ${costDescription} (£${totalCost})`);
        continue; // Skip this job as it's already been submitted
      }

      hasNewCosts = true;
      console.log(`✅ Adding new job cost: ${costDescription} (£${totalCost})`);

      if (jobCategory.group === 'fixed') {
        const fixedCostMapping: Record<string, keyof typeof fixedCosts> = {
          'transport_in': 'transportIn',
          'transport_out': 'transportOut',
          'mot': 'mot'
        };
        const fixedCostKey = fixedCostMapping[jobCategory.value];
        if (fixedCostKey) {
          // For fixed costs, accumulate if there are multiple of the same type
          const currentValue = parseFloat(fixedCosts[fixedCostKey] || '0');
          fixedCosts[fixedCostKey] = (currentValue + totalCost).toString();
        }
      } else {
        const group = jobCategory.group as 'exVat' | 'incVat';
        const category = jobCategory.category as keyof typeof groupedCosts.exVat;
        if (group && category) {
          groupedCosts[group][category].push({
            description: costDescription,
            amount: totalCost.toString()
          });
        }
      }
    }

    // If no new costs to submit, return early
    if (!hasNewCosts) {
      console.log('ℹ️ No new costs to submit - all job costs already exist in vehicle costs');
      return;
    }

    console.log('💰 Submitting new job costs only:', {
      registration: job.registration,
      newFixedCosts: fixedCosts,
      newGroupedCosts: groupedCosts
    });

    // Submit to the existing vehicle costs API
    const response = await fetch('/api/stock-actions/vehicle-costs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stockId: job.stockId,
        stockReference: job.stockId,
        registration: job.registration,
        fixedCosts,
        groupedCosts
      }),
    });

    if (!response.ok) {
      console.error('Failed to submit job costs:', await response.text());
      throw new Error('Failed to submit costs to system');
    }

    const result = await response.json();
    if (result.merged) {
      console.log('✅ Job costs merged with existing costs successfully');
    } else {
      console.log('✅ Job costs submitted successfully');
    }
  };


  // Open job dialog for specific column
  const openAddJobDialog = (status: string, columnName: string) => {
    setSelectedColumnStatus(status);
    setSelectedColumnName(columnName);
    setShowAddJobDialog(true);
  };

  // Get job category label
  const getJobCategoryLabel = (category: string): string => {
    const jobCategory = JOB_CATEGORIES.find(cat => cat.value === category);
    return jobCategory ? jobCategory.label : category;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Get priority icon
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-3 h-3" />;
      case 'high': return <ArrowUp className="w-3 h-3" />;
      case 'medium': return <Circle className="w-3 h-3" />;
      case 'low': return <CheckCircle2 className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={`transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-slate-600'
          }`}>
            Loading Vehicle Job Cards...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className={`w-16 h-16 ${
          isDarkMode ? 'bg-red-900/20' : 'bg-red-100'
        } rounded-full flex items-center justify-center mx-auto mb-4`}>
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className={`text-lg font-semibold transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        } mb-2`}>
          Error Loading Vehicle Job Cards
        </h3>
        <p className={`transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-600'
        } mb-4`}>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold flex items-center gap-3 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <div className="w-4 h-4 rounded-full bg-blue-600" />
              Vehicle Job Cards
            </h1>
            <p className={`mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-600'
            }`}>
              Manage vehicle service and repair jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && (
              <div className={`flex items-center gap-2 text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (VEHICLE_JOB_COLUMNS.length > 0) {
                  openAddJobDialog(VEHICLE_JOB_COLUMNS[0].id, VEHICLE_JOB_COLUMNS[0].name);
                }
              }}
              disabled={createJobMutation.isPending}
            >
              {createJobMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Job Card
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-6">
          {VEHICLE_JOB_COLUMNS.map((column) => (
            <div key={column.id} className="w-full min-w-0">
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                    <h3 className={`font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {column.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {jobCardsByStatus[column.id]?.length || 0}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Column Tasks */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] max-h-[70vh] overflow-y-auto p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver
                        ? `border-2 ${
                            isDarkMode 
                              ? 'bg-blue-900/20 border-blue-600' 
                              : 'bg-blue-50 border-blue-300'
                          }`
                        : `border-2 border-transparent ${
                            isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'
                          }`
                    }`}
                  >
                    {jobCardsByStatus[column.id]?.map((job, index) => (
                      <Draggable key={job.id} draggableId={job.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 cursor-pointer transition-all hover:shadow-md ${
                              snapshot.isDragging 
                                ? `shadow-lg rotate-2 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}` 
                                : `${isDarkMode ? 'bg-gray-800' : 'bg-white'}`
                            }`}
                            onClick={() => handleEditJob(job)}
                          >
                            <CardContent className="p-4">
                              {/* Task Header */}
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  {/* Vehicle Registration */}
                                  <div className="flex items-center gap-2 mb-1">
                                    <Car className="w-4 h-4 text-blue-500" />
                                    <span className={`font-medium text-sm ${
                                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                    }`}>
                                      {job.registration}
                                    </span>
                                  </div>
                                  
                                  {/* Jobs Display */}
                                  {job.jobs && Array.isArray(job.jobs) && job.jobs.length > 0 ? (
                                    <div className="space-y-1">
                                      <div className={`text-xs font-medium ${
                                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                      }`}>
                                        {job.jobs.length} {job.jobs.length === 1 ? 'Job' : 'Jobs'}:
                                      </div>
                                      {job.jobs.map((individualJob: any, index: number) => (
                                        <div key={index} className={`text-xs p-2 rounded ${
                                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                        }`}>
                                          <div className={`font-medium ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {individualJob.jobType}
                                          </div>
                                          <div className={`text-xs ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                          }`}>
                                            {getJobCategoryLabel(individualJob.jobCategory)}
                                            {individualJob.estimatedHours && ` • ${individualJob.estimatedHours}h`}
                                            {individualJob.totalCost && ` • £${individualJob.totalCost}`}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div>
                                      <h4 className={`font-medium text-sm leading-tight transition-colors duration-300 ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                      }`}>
                                        {job.jobType}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Wrench className="w-3 h-3 text-gray-500" />
                                        <span className={`text-xs transition-colors duration-300 ${
                                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                        }`}>
                                          {getJobCategoryLabel(job.jobCategory)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${
                                  getPriorityColor(job.priority || 'medium')
                                }`}>
                                  {getPriorityIcon(job.priority || 'medium')}
                                </div>
                              </div>

                              {/* Garage Details */}
                              {job.garageDetails && (
                                <p className={`text-xs mb-3 line-clamp-2 transition-colors duration-300 ${
                                  isDarkMode ? 'text-white' : 'text-gray-600'
                                }`}>
                                  {job.garageDetails}
                                </p>
                              )}

                              {/* Task Footer */}
                              <div className={`flex items-center justify-between text-xs transition-colors duration-300 ${
                                isDarkMode ? 'text-white' : 'text-gray-500'
                              }`}>
                                <div className="flex items-center gap-3">
                                  {job.estimatedHours && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {job.estimatedHours}h
                                    </div>
                                  )}
                                  {job.estimatedCost && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <PoundSterling className="w-3 h-3" />
                                      {parseFloat(job.estimatedCost).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                                {job.assignedTo && (
                                  <div className="flex items-center gap-1" title={`Assigned to: ${getAssignedUserName(job.assignedTo)}`}>
                                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
                                      {getAssignedUserInitials(job.assignedTo)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Costs Submitted Badge */}
                              {job.costsSubmitted && (
                                <div className="mt-2">
                                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                    Costs Submitted
                                  </Badge>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {/* Add Task Button */}
                    <Button 
                      variant="ghost" 
                      className={`w-full mt-2 border-2 border-dashed transition-colors duration-300 ${
                        isDarkMode 
                          ? 'border-gray-600 hover:border-blue-500' 
                          : 'border-gray-300 hover:border-blue-400'
                      }`}
                      onClick={() => openAddJobDialog(column.id, column.name)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Job Card
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Add Job Dialog */}
      <VehicleJobCardDialog
        open={showAddJobDialog}
        onOpenChange={setShowAddJobDialog}
        onAddJob={handleAddJob}
        columnName={selectedColumnName}
        jobCategories={JOB_CATEGORIES}
      />

      {/* Edit Job Dialog */}
      <VehicleJobCardEditDialog
        open={showEditJobDialog}
        onOpenChange={setShowEditJobDialog}
        job={selectedJob}
        onUpdateJob={handleUpdateJob}
        onDeleteJob={(job: VehicleJobCard) => {
          setJobToDelete(job);
          setShowDeletionDialog(true);
        }}
        jobCategories={JOB_CATEGORIES}
      />

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job Card</DialogTitle>
            <DialogDescription>
              {areCostsSaved 
                ? "Costs are already saved. Mark this job as complete?"
                : "Are you sure all work is complete and costs are accurate for this job?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleJobCompletion(false)}
              disabled={isCompletingJob}
            >
              {isCompletingJob ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Completing...
                </>
              ) : (
                areCostsSaved ? 'Complete Job' : 'Complete Without Costs'
              )}
            </Button>
            {!areCostsSaved && (
              <Button
                onClick={() => handleJobCompletion(true)}
                disabled={isCompletingJob}
              >
                {isCompletingJob ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving & Completing...
                  </>
                ) : (
                  'Submit to Costs & Complete'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deletion Dialog */}
      <Dialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Card</DialogTitle>
            <DialogDescription>
              {areCostsSaved 
                ? "Costs are saved. Do you want to delete this card?"
                : "Do you want to save the costs before deleting this job card?"
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleJobDeletion(false)}
              disabled={isDeletingJob || isSubmittingCosts}
            >
              {isDeletingJob ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                areCostsSaved ? 'Delete Card' : 'Delete Without Saving'
              )}
            </Button>
            {!areCostsSaved && (
              <Button
                onClick={() => handleJobDeletion(true)}
                disabled={isDeletingJob || isSubmittingCosts}
              >
                {isSubmittingCosts ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving & Deleting...
                  </>
                ) : (
                  'Submit to Costs & Delete'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}