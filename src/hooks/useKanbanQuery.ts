"use client";

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';

// Types
interface KanbanBoardSummary {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

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
}

interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  limitWip?: number;
  tasks: KanbanTask[];
}

interface KanbanBoardData {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  columns: KanbanColumn[];
  createdAt: string;
  updatedAt: string;
}

// Query key factory for consistent cache keys - USER-SPECIFIC to prevent cross-user data leakage
export const kanbanQueryKeys = {
  all: ['kanban'] as const,
  boards: (userId?: string) => [...kanbanQueryKeys.all, 'boards', userId].filter(Boolean),
  board: (boardId: string, userId?: string) => [...kanbanQueryKeys.all, 'board', boardId, userId].filter(Boolean),
  tasks: (userId?: string) => [...kanbanQueryKeys.all, 'tasks', userId].filter(Boolean),
  task: (taskId: string, userId?: string) => [...kanbanQueryKeys.all, 'task', taskId, userId].filter(Boolean),
};

// Fetch function for boards list
async function fetchKanbanBoards(userId?: string): Promise<KanbanBoardSummary[]> {
  console.log('\n🔄 ===== REACT QUERY: FETCHING KANBAN BOARDS =====');
  console.log('📡 Request URL:', '/api/kanban/boards');
  console.log('👤 User ID:', userId);
  console.log('🔑 Cache Key:', JSON.stringify(kanbanQueryKeys.boards(userId)));
  console.log('⚠️  This should only appear on cache misses or first loads!');
  
  const response = await fetch('/api/kanban/boards', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  console.log('\n📦 ===== REACT QUERY: RECEIVED BOARDS RESPONSE =====');
  console.log('✅ Response success:', result.success);
  console.log('📊 Boards count:', result.data?.length || 0);

  if (!response.ok || !result.success) {
    console.log('❌ REACT QUERY: Fetch failed:', result.error || 'Unknown error');
    throw new Error(result.error || 'Failed to fetch kanban boards');
  }

  return result.data || [];
}

// Fetch function for individual board with tasks
async function fetchKanbanBoard(boardId: string, userId?: string): Promise<KanbanBoardData> {
  console.log('\n🔄 ===== REACT QUERY: FETCHING KANBAN BOARD =====');
  console.log('📡 Request URL:', `/api/kanban/boards/${boardId}`);
  console.log('👤 User ID:', userId);
  console.log('🔑 Cache Key:', JSON.stringify(kanbanQueryKeys.board(boardId, userId)));

  const response = await fetch(`/api/kanban/boards/${boardId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const result = await response.json();
  
  console.log('\n📦 ===== REACT QUERY: RECEIVED BOARD RESPONSE =====');
  console.log('✅ Response success:', result.success);

  if (!response.ok || !result.success) {
    console.log('❌ REACT QUERY: Fetch failed:', result.error || 'Unknown error');
    throw new Error(result.error || 'Failed to fetch kanban board');
  }

  return result.data;
}

// Hook for fetching kanban boards with caching
export function useKanbanBoardsQuery(enabled: boolean = true) {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: kanbanQueryKeys.boards(userId),
    queryFn: () => fetchKanbanBoards(userId),
    enabled: enabled && !!userId, // Only run when enabled AND user is available
    staleTime: 5 * 60 * 1000, // 5 minutes - boards don't change frequently
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 1,
    networkMode: 'offlineFirst',
  });

  return {
    data: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}

// Hook for fetching individual kanban board with caching
export function useKanbanBoardQuery(boardId: string, enabled: boolean = true) {
  const { user } = useUser();
  const userId = user?.id;

  const query = useQuery({
    queryKey: kanbanQueryKeys.board(boardId, userId),
    queryFn: () => fetchKanbanBoard(boardId, userId),
    enabled: enabled && !!boardId && !!userId, // Only run when enabled AND boardId AND user are available
    staleTime: 3 * 60 * 1000, // 3 minutes - board data changes more frequently
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error?.message || null,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}

// Mutation hooks for board operations
export function useCreateBoardMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (boardData: { name: string; description?: string; color: string }) => {
      const response = await fetch('/api/kanban/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create board');
      }

      return result.data;
    },
    onSuccess: (newBoard) => {
      // Update the boards cache with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.boards(userId),
        (oldBoards: KanbanBoardSummary[] | undefined) => {
          return oldBoards ? [...oldBoards, newBoard] : [newBoard];
        }
      );
    },
  });
}

export function useUpdateBoardMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ 
      boardId, 
      boardData 
    }: { 
      boardId: string; 
      boardData: { name: string; description?: string; color: string } 
    }) => {
      const response = await fetch(`/api/kanban/boards/${boardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(boardData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update board');
      }

      return result.data;
    },
    onSuccess: (updatedBoard, { boardId }) => {
      // Update boards list cache with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.boards(userId),
        (oldBoards: KanbanBoardSummary[] | undefined) => {
          return oldBoards?.map(board => 
            board.id === boardId ? { ...board, ...updatedBoard } : board
          ) || [];
        }
      );

      // Update individual board cache with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.board(boardId, userId),
        (oldBoard: KanbanBoardData | undefined) => {
          return oldBoard ? { ...oldBoard, ...updatedBoard } : undefined;
        }
      );
    },
  });
}

export function useDeleteBoardMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (boardId: string) => {
      console.log(`🗑️ Attempting to delete board: ${boardId}`);
      
      const response = await fetch(`/api/kanban/boards/${boardId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      console.log(`📡 Delete response:`, { 
        ok: response.ok, 
        status: response.status, 
        success: result.success,
        error: result.error 
      });
      
      if (!response.ok || !result.success) {
        const errorMessage = result.error || `HTTP ${response.status}: Failed to delete board`;
        console.error(`❌ Delete board failed:`, errorMessage);
        throw new Error(errorMessage);
      }

      console.log(`✅ Board deleted successfully: ${boardId}`);
      return result;
    },
    onSuccess: (_, boardId) => {
      // Remove from boards list cache with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.boards(userId),
        (oldBoards: KanbanBoardSummary[] | undefined) => {
          return oldBoards?.filter(board => board.id !== boardId) || [];
        }
      );

      // Remove individual board cache with correct query key that includes userId
      queryClient.removeQueries({ queryKey: kanbanQueryKeys.board(boardId, userId) });
    },
  });
}

// Task mutation hooks
export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (taskData: {
      boardId: string;
      columnId: string;
      title: string;
      description?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      assignedTo?: string;
      dueDate?: string;
      tags?: string[];
      stockId?: string;
      estimatedHours?: number;
    }) => {
      const response = await fetch('/api/kanban/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create task');
      }

      return result.data;
    },
    onSuccess: (newTask, variables) => {
      // Update the board cache to include the new task with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.board(variables.boardId, userId),
        (oldBoard: KanbanBoardData | undefined) => {
          if (!oldBoard) return oldBoard;

          return {
            ...oldBoard,
            columns: oldBoard.columns.map(column =>
              column.id === variables.columnId
                ? { ...column, tasks: [...column.tasks, newTask] }
                : column
            ),
          };
        }
      );
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      taskId,
      boardId,
      taskData,
    }: {
      taskId: string;
      boardId: string;
      taskData: Partial<KanbanTask>;
    }) => {
      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update task');
      }

      return result.data;
    },
    onSuccess: (updatedTask, { boardId, taskId }) => {
      // Update the board cache with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.board(boardId, userId),
        (oldBoard: KanbanBoardData | undefined) => {
          if (!oldBoard) return oldBoard;

          return {
            ...oldBoard,
            columns: oldBoard.columns.map(column => ({
              ...column,
              tasks: column.tasks.map(task =>
                task.id === taskId ? { ...task, ...updatedTask } : task
              ),
            })),
          };
        }
      );
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ taskId, boardId }: { taskId: string; boardId: string }) => {
      const response = await fetch(`/api/kanban/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete task');
      }

      return result.data;
    },
    onSuccess: (_, { boardId, taskId }) => {
      // Update the board cache to remove the task with correct query key that includes userId
      queryClient.setQueryData(
        kanbanQueryKeys.board(boardId, userId),
        (oldBoard: KanbanBoardData | undefined) => {
          if (!oldBoard) return oldBoard;

          return {
            ...oldBoard,
            columns: oldBoard.columns.map(column => ({
              ...column,
              tasks: column.tasks.filter(task => task.id !== taskId),
            })),
          };
        }
      );
    },
  });
}

// Helper function to invalidate all kanban caches
export function useInvalidateKanbanCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.all });
  };
}
