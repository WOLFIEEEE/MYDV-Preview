import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { VehicleJobCard, NewVehicleJobCard } from '@/db/schema';

// Types for API responses
interface VehicleJobCardsResponse {
  success: boolean;
  data: VehicleJobCard[];
  error?: string;
}

interface VehicleJobCardResponse {
  success: boolean;
  data: VehicleJobCard;
  error?: string;
  message?: string;
}

// Query key factory
export const vehicleJobCardsQueryKeys = {
  all: ['vehicleJobCards'] as const,
  lists: () => [...vehicleJobCardsQueryKeys.all, 'list'] as const,
  list: (filters?: { status?: string; registration?: string; stockId?: string }) => 
    [...vehicleJobCardsQueryKeys.lists(), filters] as const,
  details: () => [...vehicleJobCardsQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...vehicleJobCardsQueryKeys.details(), id] as const,
};

// Fetch vehicle job cards
async function fetchVehicleJobCards(filters?: { 
  status?: string; 
  registration?: string; 
  stockId?: string; 
}): Promise<VehicleJobCard[]> {
  const params = new URLSearchParams();
  
  if (filters?.status) params.append('status', filters.status);
  if (filters?.registration) params.append('registration', filters.registration);
  if (filters?.stockId) params.append('stockId', filters.stockId);
  
  const url = `/api/vehicle-job-cards${params.toString() ? `?${params.toString()}` : ''}`;
  
  console.log('🔄 Fetching vehicle job cards:', url);
  
  const response = await fetch(url);
  const result: VehicleJobCardsResponse = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch vehicle job cards');
  }
  
  return result.data;
}

// Fetch single vehicle job card
async function fetchVehicleJobCard(id: string): Promise<VehicleJobCard> {
  console.log('🔄 Fetching vehicle job card:', id);
  
  const response = await fetch(`/api/vehicle-job-cards/${id}`);
  const result: VehicleJobCardResponse = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to fetch vehicle job card');
  }
  
  return result.data;
}

// API interface for creating vehicle job cards (with string dates)
export interface CreateVehicleJobCardData {
  stockId: string;
  registration: string;
  jobType: string;
  garageDetails?: string | null;
  jobCategory: string;
  status?: string;
  priority?: string;
  estimatedHours?: number | null;
  estimatedCost?: string | null;
  costDescription?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  customerNotes?: string | null;
  attachments?: any;
  dueDate?: string | null; // ISO date string for API
  jobs?: Array<{
    jobCategory: string;
    jobType: string;
    estimatedHours?: number;
    totalCost?: number;
  }> | null;
}

// Create vehicle job card
async function createVehicleJobCard(data: CreateVehicleJobCardData): Promise<VehicleJobCard> {
  console.log('📝 Creating vehicle job card:', data);
  
  const response = await fetch('/api/vehicle-job-cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  const result: VehicleJobCardResponse = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to create vehicle job card');
  }
  
  return result.data;
}

// API interface for updating vehicle job cards (with string dates)
export interface UpdateVehicleJobCardData {
  jobType?: string;
  garageDetails?: string | null;
  jobCategory?: string;
  status?: string;
  priority?: string;
  estimatedHours?: number | null;
  estimatedCost?: string | null;
  costDescription?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
  customerNotes?: string | null;
  attachments?: any;
  dueDate?: string | null; // ISO date string for API
  costsSubmitted?: boolean;
  jobs?: Array<{
    jobCategory: string;
    jobType: string;
    estimatedHours?: number;
    totalCost?: number;
  }> | null;
}

// Update vehicle job card
async function updateVehicleJobCard(id: string, data: UpdateVehicleJobCardData): Promise<VehicleJobCard> {
  console.log('📝 Updating vehicle job card:', id, data);
  
  const response = await fetch(`/api/vehicle-job-cards/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  const result: VehicleJobCardResponse = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to update vehicle job card');
  }
  
  return result.data;
}

// Delete vehicle job card
async function deleteVehicleJobCard(id: string): Promise<void> {
  console.log('🗑️ Deleting vehicle job card:', id);
  
  const response = await fetch(`/api/vehicle-job-cards/${id}`, {
    method: 'DELETE',
  });
  
  const result = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to delete vehicle job card');
  }
}

// Hook to fetch vehicle job cards
export function useVehicleJobCards(filters?: { 
  status?: string; 
  registration?: string; 
  stockId?: string; 
}) {
  return useQuery({
    queryKey: vehicleJobCardsQueryKeys.list(filters),
    queryFn: () => fetchVehicleJobCards(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to fetch single vehicle job card
export function useVehicleJobCard(id: string) {
  return useQuery({
    queryKey: vehicleJobCardsQueryKeys.detail(id),
    queryFn: () => fetchVehicleJobCard(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook to create vehicle job card
export function useCreateVehicleJobCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createVehicleJobCard,
    onSuccess: () => {
      // Invalidate and refetch vehicle job cards
      queryClient.invalidateQueries({ queryKey: vehicleJobCardsQueryKeys.lists() });
    },
  });
}

// Hook to update vehicle job card
export function useUpdateVehicleJobCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleJobCardData }) => 
      updateVehicleJobCard(id, data),
    onSuccess: (updatedJobCard) => {
      // Update the specific job card in cache
      queryClient.setQueryData(
        vehicleJobCardsQueryKeys.detail(updatedJobCard.id),
        updatedJobCard
      );
      
      // Update the job card in all list queries
      queryClient.setQueriesData(
        { queryKey: vehicleJobCardsQueryKeys.lists() },
        (oldData: VehicleJobCard[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map(job => 
            job.id === updatedJobCard.id ? updatedJobCard : job
          );
        }
      );
    },
  });
}

// Hook to delete vehicle job card
export function useDeleteVehicleJobCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteVehicleJobCard,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: vehicleJobCardsQueryKeys.detail(deletedId) });
      
      // Invalidate lists to refresh them
      queryClient.invalidateQueries({ queryKey: vehicleJobCardsQueryKeys.lists() });
    },
  });
}
