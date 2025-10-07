"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Kanban, 
  Car, 
  Calendar, 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  Circle, 
  ArrowUp,
  Plus,
  ExternalLink,
  RefreshCw,
  Loader2,
  PoundSterling,
  Wrench,
  FileText,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

// Job categories that map to cost types (from VehicleJobCardsBoard)
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

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  tags?: string[];
  stockId?: string;
  estimatedHours?: number;
  actualHours?: number;
  createdAt: string;
  updatedAt: string;
  boardId?: string;
  boardName?: string;
  columnName?: string;
  type: 'kanban';
}

interface VehicleJobCard {
  id: string;
  stockId: string;
  registration: string;
  jobType: string;
  garageDetails?: string;
  jobCategory: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours?: number;
  actualHours?: number;
  estimatedCost?: string;
  actualCost?: string;
  costDescription?: string;
  costsSubmitted?: boolean;
  costsSubmittedAt?: string;
  assignedTo?: string;
  createdBy: string;
  notes?: string;
  customerNotes?: string;
  attachments?: any;
  jobs?: any[];
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  type: 'job-card';
}

type UnifiedTask = KanbanTask | VehicleJobCard;

interface VehicleKanbanTasksProps {
  stockId: string;
  registration?: string;
}

export default function VehicleKanbanTasks({ stockId, registration }: VehicleKanbanTasksProps) {
  const { isDarkMode } = useTheme();
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch both kanban tasks and vehicle job cards for this vehicle
  const fetchVehicleTasks = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch kanban tasks and vehicle job cards in parallel
      const [kanbanResponse, jobCardsResponse] = await Promise.all([
        fetch(`/api/kanban/tasks/by-vehicle?stockId=${encodeURIComponent(stockId)}`),
        fetch(`/api/vehicle-job-cards?stockId=${encodeURIComponent(stockId)}`)
      ]);

      const [kanbanResult, jobCardsResult] = await Promise.all([
        kanbanResponse.json(),
        jobCardsResponse.json()
      ]);

      const allTasks: UnifiedTask[] = [];

      // Add kanban tasks
      if (kanbanResult.success && kanbanResult.data) {
        const kanbanTasks: KanbanTask[] = kanbanResult.data.map((task: any) => ({
          ...task,
          type: 'kanban' as const
        }));
        allTasks.push(...kanbanTasks);
      }

      // Add vehicle job cards
      if (jobCardsResult.success && jobCardsResult.data) {
        const jobCards: VehicleJobCard[] = jobCardsResult.data.map((jobCard: any) => ({
          ...jobCard,
          type: 'job-card' as const,
          title: jobCard.jobType, // Map jobType to title for consistency
          description: jobCard.garageDetails,
        }));
        allTasks.push(...jobCards);
      }

      // Sort by creation date (newest first)
      allTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTasks(allTasks);
      
      if (!kanbanResult.success && !jobCardsResult.success) {
        setError('Failed to load tasks and job cards');
      }
    } catch (err) {
      console.error('Error fetching vehicle tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stockId) {
      fetchVehicleTasks();
    }
  }, [stockId]);

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertCircle className="w-3 h-3" />;
      case 'high': return <ArrowUp className="w-3 h-3" />;
      case 'medium': return <Circle className="w-3 h-3" />;
      case 'low': return <CheckCircle2 className="w-3 h-3" />;
      default: return <Circle className="w-3 h-3" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const getJobCategoryLabel = (category: string): string => {
    const jobCategory = JOB_CATEGORIES.find(cat => cat.value === category);
    return jobCategory ? jobCategory.label : category;
  };

  const getTaskTitle = (task: UnifiedTask) => {
    if (task.type === 'kanban') {
      return task.title;
    } else {
      return task.jobType;
    }
  };

  const getTaskDescription = (task: UnifiedTask) => {
    if (task.type === 'kanban') {
      return task.description;
    } else {
      return task.garageDetails;
    }
  };

  const getTaskBoardInfo = (task: UnifiedTask) => {
    if (task.type === 'kanban') {
      return {
        boardName: task.boardName,
        columnName: task.columnName,
        boardType: 'Kanban'
      };
    } else {
      return {
        boardName: 'Vehicle Job Cards',
        columnName: task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        boardType: 'Job Card'
      };
    }
  };

  const getTaskNavigation = (task: UnifiedTask) => {
    if (task.type === 'kanban') {
      return `/kanban${task.boardId ? `?board=${task.boardId}` : ''}`;
    } else {
      return '/kanban?board=vehicle-job-cards';
    }
  };

  const getCostInfo = (task: UnifiedTask) => {
    if (task.type === 'job-card') {
      const estimated = task.estimatedCost ? parseFloat(task.estimatedCost) : null;
      const actual = task.actualCost ? parseFloat(task.actualCost) : null;
      
      return {
        hasEstimated: estimated !== null && estimated > 0,
        hasActual: actual !== null && actual > 0,
        estimated: estimated,
        actual: actual,
        costsSubmitted: task.costsSubmitted || false
      };
    }
    return null;
  };

  if (loading) {
    return (
      <Card className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Kanban className="w-5 h-5 text-blue-600" />
            Vehicle Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`} />
              <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Loading tasks...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <CardHeader className="pb-3">
          <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Kanban className="w-5 h-5 text-blue-600" />
            Vehicle Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {error}
            </p>
            <Button 
              onClick={fetchVehicleTasks}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-lg flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Kanban className="w-5 h-5 text-blue-600" />
            Vehicle Tasks & Job Cards
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              onClick={fetchVehicleTasks}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Link href="/kanban?board=dealership-tasks">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </Link>
          </div>
        </div>
        {registration && (
          <div className="flex items-center gap-2 mt-1">
            <Car className="w-3 h-3 text-gray-500" />
            <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {registration}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 pb-2">
        {tasks.length === 0 ? (
          <div className="text-center py-6">
            <Kanban className={`w-8 h-8 mx-auto mb-3 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-xs mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              No tasks or job cards found
            </p>
            <Link href="/kanban?board=dealership-tasks">
              <Button variant="outline" size="sm">
                <Plus className="w-3 h-3 mr-1" />
                Create Task
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-16rem)] overflow-y-auto">
            {tasks.map((task) => {
              const boardInfo = getTaskBoardInfo(task);
              const title = getTaskTitle(task);
              const description = getTaskDescription(task);
              const costInfo = getCostInfo(task);
              
              return (
                <Card 
                  key={`${task.type}-${task.id}`} 
                  className={`p-2 cursor-pointer transition-all hover:shadow-sm ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* Compact Task Header */}
                  <div className="flex items-start justify-between mb-1">
                    <h4 className={`font-medium text-xs leading-tight truncate flex-1 mr-2 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {title}
                    </h4>
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-white ${getPriorityColor(task.priority)}`}>
                      {getPriorityIcon(task.priority)}
                    </div>
                  </div>

                  {/* Job Category for Job Cards */}
                  {task.type === 'job-card' && (
                    <div className="flex items-center gap-1 mb-1">
                      <Wrench className="w-2.5 h-2.5 text-gray-500" />
                      <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {getJobCategoryLabel(task.jobCategory)}
                      </span>
                    </div>
                  )}

                  {/* Compact Description */}
                  {description && (
                    <p className={`text-xs mb-1 line-clamp-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {description}
                    </p>
                  )}

                  {/* Board and Status Info */}
                  <div className="flex items-center gap-1 mb-1">
                    <Badge 
                      variant={task.type === 'job-card' ? 'default' : 'outline'} 
                      className="text-xs px-1 py-0"
                    >
                      {boardInfo.boardType}
                    </Badge>
                    {boardInfo.columnName && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        {boardInfo.columnName}
                      </Badge>
                    )}
                    {/* Costs Submitted Badge for Job Cards */}
                    {task.type === 'job-card' && costInfo?.costsSubmitted && (
                      <Badge variant="outline" className="text-xs px-1 py-0 text-green-600 border-green-600">
                        <CheckCircle className="w-2 h-2 mr-0.5" />
                        Costs Submitted
                      </Badge>
                    )}
                  </div>

                  {/* Cost Information for Job Cards */}
                  {task.type === 'job-card' && costInfo && (costInfo.hasEstimated || costInfo.hasActual) && (
                    <div className="flex items-center gap-2 mb-1">
                      {costInfo.hasEstimated && (
                        <div className="flex items-center gap-1">
                          <PoundSterling className="w-2.5 h-2.5 text-blue-500" />
                          <span className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            Est: £{formatCurrency(costInfo.estimated)}
                          </span>
                        </div>
                      )}
                      {costInfo.hasActual && (
                        <div className="flex items-center gap-1">
                          <PoundSterling className="w-2.5 h-2.5 text-green-500" />
                          <span className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                            Act: £{formatCurrency(costInfo.actual)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Compact Footer */}
                  <div className={`flex items-center justify-between text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <div className="flex items-center gap-2">
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span className="text-xs">{formatDate(task.dueDate)}</span>
                        </div>
                      )}
                      {task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span className="text-xs">{task.estimatedHours}h</span>
                        </div>
                      )}
                      {/* Show actual hours for job cards if different from estimated */}
                      {task.type === 'job-card' && task.actualHours && task.actualHours !== task.estimatedHours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-orange-500" />
                          <span className="text-xs text-orange-500">{task.actualHours}h actual</span>
                        </div>
                      )}
                    </div>
                    {task.assignedTo && (
                      <div className="flex items-center gap-1" title="Assigned">
                        <User className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  {/* Additional Job Card Info */}
                  {task.type === 'job-card' && (task.notes || task.jobs) && (
                    <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                      {task.jobs && Array.isArray(task.jobs) && task.jobs.length > 0 && (
                        <div className="flex items-center gap-1 mb-1">
                          <FileText className="w-2.5 h-2.5 text-gray-500" />
                          <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {task.jobs.length} sub-job{task.jobs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                      {task.notes && (
                        <p className={`text-xs line-clamp-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Notes: {task.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Compact Action Button */}
                  <div className="mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
                    <Link href={getTaskNavigation(task)}>
                      <Button variant="ghost" size="sm" className="w-full h-6 text-xs">
                        <ExternalLink className="w-2.5 h-2.5 mr-1" />
                        Open
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
