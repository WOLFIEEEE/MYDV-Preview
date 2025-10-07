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
import { Calendar, Tag, Clock, Edit3, User, Car, Search, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'owner' | 'team_member';
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description?: string;
    priority: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
    stockId?: string;
  } | null;
  onUpdateTask: (taskId: string, taskData: {
    title: string;
    description?: string;
    priority: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
    stockId?: string;
    vehicleRegistration?: string;
  }) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function EditTaskDialog({ 
  open, 
  onOpenChange, 
  task,
  onUpdateTask,
  onDeleteTask
}: EditTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    dueDate: '',
    estimatedHours: '',
    vehicleRegistration: '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Vehicle search state
  const [vehicleSuggestions, setVehicleSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [vehicleValidation, setVehicleValidation] = useState({
    isValid: false,
    isChecking: false,
    message: '',
    stockId: ''
  });

  // Fetch team members when dialog opens
  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open]);

  const fetchTeamMembers = async () => {
    setLoadingMembers(true);
    try {
      console.log('🔄 [EditTask] Fetching team members...');
      const response = await fetch('/api/team-members');
      console.log('📡 [EditTask] Team members API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📊 [EditTask] Team members API result:', result);
        
        if (result.success) {
          console.log('✅ [EditTask] Setting team members:', result.data);
          // Deduplicate team members by ID to prevent React key conflicts
          const uniqueMembers = (result.data || []).filter((member: TeamMember, index: number, array: TeamMember[]) => 
            array.findIndex(m => m.id === member.id) === index
          );
          setTeamMembers(uniqueMembers);
        } else {
          console.error('❌ [EditTask] Team members API failed:', result.error);
        }
      } else {
        console.error('❌ [EditTask] Team members API HTTP error:', response.status);
      }
    } catch (error) {
      console.error('❌ [EditTask] Error fetching team members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Search for vehicle suggestions based on input
  const searchVehicleSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setVehicleSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/inventory/search?query=${encodeURIComponent(searchTerm)}&limit=5`);
      const result = await response.json();

      if (result.success && result.data) {
        setVehicleSuggestions(result.data);
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
        message: '',
        stockId: ''
      });
      setShowSuggestions(false);
      return;
    }

    // Remove spaces and convert to uppercase
    const cleanReg = registration.replace(/\s+/g, '').toUpperCase();
    
    setVehicleValidation({
      isValid: false,
      isChecking: true,
      message: 'Checking vehicle inventory...',
      stockId: ''
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
            stockId: exactMatch.stockId
          });
          // Update the form with clean registration
          setFormData(prev => ({ ...prev, vehicleRegistration: cleanReg }));
          setShowSuggestions(false);
        } else {
          setVehicleValidation({
            isValid: false,
            isChecking: false,
            message: 'This vehicle is not in your vehicle inventory. You can still update the task.',
            stockId: ''
          });
        }
      } else {
        setVehicleValidation({
          isValid: false,
          isChecking: false,
          message: 'This vehicle is not in your vehicle inventory. You can still update the task.',
          stockId: ''
        });
      }
    } catch (error) {
      console.error('Error validating vehicle registration:', error);
      setVehicleValidation({
        isValid: false,
        isChecking: false,
        message: 'Error checking vehicle. Please try again.',
        stockId: ''
      });
    }
  };

  // Handle vehicle registration input change
  const handleVehicleRegistrationChange = async (value: string) => {
    setFormData(prev => ({ ...prev, vehicleRegistration: value }));
    
    // Search for suggestions as user types
    await searchVehicleSuggestions(value);
    
    // Validate if user stops typing (debounced)
    clearTimeout((window as any).vehicleValidationTimeout);
    (window as any).vehicleValidationTimeout = setTimeout(() => {
      validateVehicleRegistration(value);
    }, 500);
  };

  // Handle selecting a vehicle from suggestions
  const handleSelectVehicle = (vehicle: any) => {
    const registration = vehicle.registration || '';
    setFormData(prev => ({ ...prev, vehicleRegistration: registration }));
    setVehicleValidation({
      isValid: true,
      isChecking: false,
      message: `Vehicle selected: ${vehicle.make} ${vehicle.model}`,
      stockId: vehicle.stockId
    });
    setShowSuggestions(false);
  };

  // Update form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || 'unassigned',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours?.toString() || '',
        vehicleRegistration: '', // We'll need to get this from the task if it has stockId
      });

      // If task has stockId, fetch vehicle registration
      if (task.stockId) {
        fetchVehicleRegistration(task.stockId);
      } else {
        // Reset vehicle validation if no stockId
        setVehicleValidation({
          isValid: false,
          isChecking: false,
          message: '',
          stockId: ''
        });
      }
    }
  }, [task]);

  // Fetch vehicle registration for existing stockId
  const fetchVehicleRegistration = async (stockId: string) => {
    try {
      const response = await fetch(`/api/inventory/search?stockId=${encodeURIComponent(stockId)}`);
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const vehicle = result.data[0];
        const registration = vehicle.registration || '';
        setFormData(prev => ({ ...prev, vehicleRegistration: registration }));
        setVehicleValidation({
          isValid: true,
          isChecking: false,
          message: `Vehicle found: ${vehicle.make} ${vehicle.model}`,
          stockId: vehicle.stockId
        });
      }
    } catch (error) {
      console.error('Error fetching vehicle registration:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !task) {
      return;
    }

    onUpdateTask(task.id, {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      priority: formData.priority,
      assignedTo: formData.assignedTo === 'unassigned' ? undefined : formData.assignedTo || undefined,
      dueDate: formData.dueDate || undefined,
      estimatedHours: formData.estimatedHours ? parseInt(formData.estimatedHours) : undefined,
      stockId: vehicleValidation.stockId || undefined,
      vehicleRegistration: formData.vehicleRegistration.trim() || undefined,
    });

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (task) {
      onDeleteTask(task.id);
      onOpenChange(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        assignedTo: task.assignedTo || 'unassigned',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
        estimatedHours: task.estimatedHours?.toString() || '',
        vehicleRegistration: '', // Reset to empty, will be fetched if stockId exists
      });

      // If task has stockId, fetch vehicle registration
      if (task.stockId) {
        fetchVehicleRegistration(task.stockId);
      } else {
        // Reset vehicle validation if no stockId
        setVehicleValidation({
          isValid: false,
          isChecking: false,
          message: '',
          stockId: ''
        });
      }
    }
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            Edit Task
          </DialogTitle>
          <DialogDescription>
            Make changes to your task. Click save when you're done.
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Task Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                autoFocus
              />
            </div>

            {/* Task Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Add task description (optional)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
              />
            </div>

            {/* Vehicle Registration */}
            <div className="space-y-2">
              <Label htmlFor="vehicleRegistration" className="flex items-center gap-1">
                <Car className="w-3 h-3" />
                Vehicle Registration (Optional)
              </Label>
              <div className="relative">
                <Input
                  id="vehicleRegistration"
                  placeholder="Enter vehicle registration..."
                  value={formData.vehicleRegistration}
                  onChange={(e) => handleVehicleRegistrationChange(e.target.value)}
                  onFocus={() => {
                    if (formData.vehicleRegistration.length >= 2) {
                      searchVehicleSuggestions(formData.vehicleRegistration);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow for clicks
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  className={`pr-10 ${
                    vehicleValidation.isValid 
                      ? 'border-green-500 focus-visible:ring-green-500' 
                      : vehicleValidation.message && !vehicleValidation.isChecking
                        ? 'border-orange-500 focus-visible:ring-orange-500'
                        : ''
                  }`}
                />
                
                {/* Validation Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {vehicleValidation.isChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  ) : vehicleValidation.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : vehicleValidation.message ? (
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  ) : (
                    <Search className="w-4 h-4 text-gray-400" />
                  )}
                </div>

                {/* Vehicle Suggestions Dropdown */}
                {showSuggestions && vehicleSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {vehicleSuggestions.map((vehicle, index) => (
                      <div
                        key={`${vehicle.stockId}-${index}`}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleSelectVehicle(vehicle)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-gray-900">
                              {vehicle.registration || 'No Registration'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            {vehicle.stockId && (
                              <div className="text-xs text-blue-600 mt-1">
                                Stock ID: {vehicle.stockId}
                              </div>
                            )}
                          </div>
                          <Car className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Validation Message */}
              {vehicleValidation.message && (
                <div className={`flex items-center gap-2 text-xs ${
                  vehicleValidation.isValid 
                    ? 'text-green-600' 
                    : vehicleValidation.isChecking
                      ? 'text-blue-600'
                      : 'text-orange-600'
                }`}>
                  {vehicleValidation.isChecking ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : vehicleValidation.isValid ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span>{vehicleValidation.message}</span>
                </div>
              )}
            </div>

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

            {/* Priority and Due Date Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        High
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Urgent
                      </div>
                    </SelectItem>
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
                />
              </div>
            </div>

            {/* Estimated Hours */}
            <div className="space-y-2">
              <Label htmlFor="estimatedHours" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Estimated Hours
              </Label>
              <Input
                id="estimatedHours"
                type="number"
                placeholder="e.g., 2"
                min="0"
                max="999"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              />
            </div>

            <DialogFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Task
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.title.trim()}>
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Delete Task</h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </p>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                >
                  Delete Task
                </Button>
              </DialogFooter>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
