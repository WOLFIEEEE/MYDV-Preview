"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  MoreHorizontal, 
  Calendar, 
  Clock, 
  Tag,
  Car,
  AlertCircle,
  CheckCircle2,
  Circle,
  ArrowUp,
  Edit3,
  Trash2,
  Settings,
  Palette,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useUser } from '@clerk/nextjs';
import AddTaskDialog from './AddTaskDialog';
import AddColumnDialog from './AddColumnDialog';
import EditTaskDialog from './EditTaskDialog';
import EditColumnDialog from './EditColumnDialog';
import ColumnSettingsDialog from './ColumnSettingsDialog';
import { useTheme } from "@/contexts/ThemeContext";
import { 
  useKanbanBoardQuery, 
  useCreateTaskMutation, 
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useInvalidateKanbanCache,
  kanbanQueryKeys
} from "@/hooks/useKanbanQuery";
import { useQueryClient } from '@tanstack/react-query';

// Types - Component-specific types that match the API response structure
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
  columns: KanbanColumn[];
}

interface KanbanBoardProps {
  boardId: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'owner' | 'team_member';
}

export default function KanbanBoard({ boardId }: KanbanBoardProps) {
  const { isDarkMode } = useTheme();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const invalidateCache = useInvalidateKanbanCache();
  
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showAddColumnDialog, setShowAddColumnDialog] = useState(false);
  const [showEditTaskDialog, setShowEditTaskDialog] = useState(false);
  const [showEditColumnDialog, setShowEditColumnDialog] = useState(false);
  const [showColumnSettingsDialog, setShowColumnSettingsDialog] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<KanbanColumn | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // React Query hooks
  const { 
    data: board, 
    loading, 
    error, 
    refetch,
    isFetching 
  } = useKanbanBoardQuery(boardId);

  const createTaskMutation = useCreateTaskMutation();
  const updateTaskMutation = useUpdateTaskMutation();
  const deleteTaskMutation = useDeleteTaskMutation();

  // Fetch team members on component mount
  useEffect(() => {
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

    fetchTeamMembers();
  }, []);

  // Close dropdowns when dialogs open
  useEffect(() => {
    if (showAddTaskDialog || showEditTaskDialog || showEditColumnDialog || showColumnSettingsDialog) {
      setOpenDropdownId(null);
    }
  }, [showAddTaskDialog, showEditTaskDialog, showEditColumnDialog, showColumnSettingsDialog]);

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

  // Helper function to filter tasks based on current user
  const getFilteredTasks = (tasks: KanbanTask[]): KanbanTask[] => {
    if (!showOnlyMyTasks || !user) {
      return tasks;
    }
    return tasks.filter(task => task.assignedTo === user.id);
  };

  // Handle drag and drop
  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // If no destination, do nothing
    if (!destination) return;

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (!board) return;

    // Optimistically update the cache
    const previousBoard = queryClient.getQueryData(kanbanQueryKeys.board(boardId, user?.id));
    
    queryClient.setQueryData(kanbanQueryKeys.board(boardId, user?.id), (oldBoard: KanbanBoardData | undefined) => {
      if (!oldBoard) return oldBoard;

      const newBoard = { ...oldBoard };
      const newColumns = [...newBoard.columns];

      // Find source and destination columns
      const sourceColumn = newColumns.find(col => col.id === source.droppableId);
      const destColumn = newColumns.find(col => col.id === destination.droppableId);

      if (!sourceColumn || !destColumn) return oldBoard;

      // Create a deep copy of the task arrays to avoid mutation
      const sourceColumnCopy = { ...sourceColumn, tasks: [...sourceColumn.tasks] };
      const destColumnCopy = sourceColumn.id === destColumn.id 
        ? sourceColumnCopy 
        : { ...destColumn, tasks: [...destColumn.tasks] };

      // Remove task from source column
      const [movedTask] = sourceColumnCopy.tasks.splice(source.index, 1);

      // Add task to destination column
      destColumnCopy.tasks.splice(destination.index, 0, movedTask);

      // Update the columns array
      const updatedColumns = newColumns.map(col => {
        if (col.id === sourceColumn.id) return sourceColumnCopy;
        if (col.id === destColumn.id && col.id !== sourceColumn.id) return destColumnCopy;
        return col;
      });

      return { ...newBoard, columns: updatedColumns };
    });

    // Update backend
    try {
      const response = await fetch('/api/kanban/tasks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: draggableId,
          columnId: destination.droppableId,
          position: destination.index,
          boardId: board.id,
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('Error updating task position:', result.error || 'Unknown error');
        // Revert on error
        queryClient.setQueryData(kanbanQueryKeys.board(boardId, user?.id), previousBoard);
        
        // Show error message to user (you can add toast notification here)
        alert('Failed to move task. Please try again.');
        return;
      }

      // Optionally, you can invalidate and refetch to ensure consistency
      // queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.board(boardId, user?.id) });
      
    } catch (error) {
      console.error('Error updating task position:', error);
      // Revert on error
      queryClient.setQueryData(kanbanQueryKeys.board(boardId, user?.id), previousBoard);
      
      // Show error message to user (you can add toast notification here)
      alert('Failed to move task. Please check your connection and try again.');
    }
  };

  // Handle adding a new task
  const handleAddTask = async (taskData: { 
    title: string; 
    description?: string; 
    priority: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
  }) => {
    if (!board || !selectedColumnId) return;

    try {
      await createTaskMutation.mutateAsync({
        boardId: board.id,
        columnId: selectedColumnId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority as 'low' | 'medium' | 'high' | 'urgent',
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate,
        estimatedHours: taskData.estimatedHours,
      });
      
      // Close the dialog
      setShowAddTaskDialog(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // Handle adding a new column
  const handleAddColumn = async (columnData: {
    name: string;
    color: string;
    limitWip?: number;
  }) => {
    if (!board) return;

    try {
      const response = await fetch('/api/kanban/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId: board.id,
          name: columnData.name,
          color: columnData.color,
          limitWip: columnData.limitWip,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Invalidate and refetch the board data
        queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.board(boardId) });
        setShowAddColumnDialog(false);
      }
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  // Open task dialog for specific column
  const openAddTaskDialog = (columnId: string, columnName: string) => {
    setSelectedColumnId(columnId);
    setSelectedColumnName(columnName);
    setShowAddTaskDialog(true);
  };

  // Handle column deletion
  const handleDeleteColumn = async (columnId: string) => {
    if (!board) return;
    
    // Confirm deletion
    if (!confirm('Are you sure you want to delete this column? All tasks in this column will be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`/api/kanban/columns/${columnId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        // Invalidate and refetch the board data
        queryClient.invalidateQueries({ queryKey: kanbanQueryKeys.board(boardId) });
      }
    } catch (error) {
      console.error('Error deleting column:', error);
    }
  };

  // Handle column editing
  const handleEditColumn = (columnId: string) => {
    const column = board?.columns.find(col => col.id === columnId);
    if (column) {
      setSelectedColumn(column);
      setShowEditColumnDialog(true);
    }
  };

  // Handle column settings
  const handleColumnSettings = (columnId: string) => {
    const column = board?.columns.find(col => col.id === columnId);
    if (column) {
      setSelectedColumn(column);
      setShowColumnSettingsDialog(true);
    }
  };

  // Handle column color change (quick action)
  const handleChangeColumnColor = (columnId: string) => {
    const column = board?.columns.find(col => col.id === columnId);
    if (column) {
      setSelectedColumn(column);
      setShowEditColumnDialog(true);
    }
  };

  // Handle task editing
  const handleEditTask = (task: KanbanTask) => {
    setSelectedTask(task);
    setShowEditTaskDialog(true);
  };

  // Handle task update
  const handleUpdateTask = async (taskId: string, taskData: {
    title: string;
    description?: string;
    priority: string;
    assignedTo?: string;
    dueDate?: string;
    estimatedHours?: number;
  }) => {
    if (!board) return;

    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        boardId: board.id,
        taskData: {
          ...taskData,
          priority: taskData.priority as 'low' | 'medium' | 'high' | 'urgent',
        },
      });
      
      // Close the dialog
      setShowEditTaskDialog(false);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!board) return;

    try {
      await deleteTaskMutation.mutateAsync({
        taskId,
        boardId: board.id,
      });
      
      // Close the dialog
      setShowEditTaskDialog(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Handle column update
  const handleUpdateColumn = async (columnId: string, columnData: {
    name?: string;
    color?: string;
    description?: string;
    limitWip?: number | null;
    position?: number;
  }) => {
    if (!board) return;

    try {
      // Call the API to update column
      const response = await fetch(`/api/kanban/columns/${columnId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(columnData),
      });

      if (!response.ok) {
        throw new Error('Failed to update column');
      }

      // Invalidate and refetch the board data
      invalidateCache();
      
      // Close dialogs but keep selectedColumn until dialogs actually close
      setShowEditColumnDialog(false);
      setShowColumnSettingsDialog(false);
    } catch (error) {
      console.error('Error updating column:', error);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-600'
          }`} />
          <p className={`${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
            Loading board tasks...
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
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        } mb-2`}>
          Error Loading Board
        </h3>
        <p className={`${
          isDarkMode ? 'text-white' : 'text-gray-600'
        } mb-4`}>
          {error}
        </p>
        <Button 
          onClick={() => refetch()}
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className={`transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-600'
        }`}>
          Board not found
        </p>
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
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: board.color }}
              />
              {board.name}
            </h1>
            {board.description && (
              <p className={`mt-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-600'
              }`}>
                {board.description}
              </p>
            )}
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
            {/* My Tasks Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-700'
              }`}>
                Show my tasks:
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlyMyTasks}
                  onChange={(e) => setShowOnlyMyTasks(e.target.checked)}
                  className="sr-only peer"
                />
                <div className={`relative w-11 h-6 rounded-full peer transition-colors duration-200 ${
                  showOnlyMyTasks
                    ? 'bg-blue-600'
                    : isDarkMode
                      ? 'bg-gray-600'
                      : 'bg-gray-200'
                } peer-focus:outline-none peer-focus:ring-4 ${
                  showOnlyMyTasks
                    ? 'peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800'
                    : 'peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800'
                }`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 ${
                    showOnlyMyTasks ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (board.columns.length > 0) {
                  openAddTaskDialog(board.columns[0].id, board.columns[0].name);
                }
              }}
              disabled={createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Task
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-6">
          {board.columns.map((column) => (
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
                      {getFilteredTasks(column.tasks).length}
                    </Badge>
                    {column.limitWip && column.tasks.length >= column.limitWip && (
                      <Badge variant="destructive" className="text-xs">
                        WIP Limit
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu 
                    modal={false}
                    open={openDropdownId === column.id}
                    onOpenChange={(open) => {
                      setOpenDropdownId(open ? column.id : null);
                    }}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label={`Column options for ${column.name}`}
                        aria-expanded={openDropdownId === column.id}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-48"
                      onCloseAutoFocus={(event) => {
                        // Prevent focus from being lost when dropdown closes
                        event.preventDefault();
                      }}
                      onEscapeKeyDown={() => {
                        setOpenDropdownId(null);
                      }}
                      onPointerDownOutside={() => {
                        setOpenDropdownId(null);
                      }}
                    >
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          openAddTaskDialog(column.id, column.name);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleEditColumn(column.id);
                        }}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Column
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleChangeColumnColor(column.id);
                        }}
                      >
                        <Palette className="w-4 h-4 mr-2" />
                        Change Color
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleColumnSettings(column.id);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Column Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(null);
                          handleDeleteColumn(column.id);
                        }}
                        className={`transition-colors duration-300 ${
                          isDarkMode 
                            ? 'text-red-400 focus:text-red-400' 
                            : 'text-red-600 focus:text-red-600'
                        }`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Column
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    {getFilteredTasks(column.tasks).map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
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
                            onClick={() => handleEditTask(task)}
                          >
                            <CardContent className="p-4">
                              {/* Task Header */}
                              <div className="flex items-start justify-between mb-2">
                                <h4 className={`font-medium text-sm leading-tight transition-colors duration-300 ${
                                  isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </h4>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${getPriorityColor(task.priority)}`}>
                                  {getPriorityIcon(task.priority)}
                                </div>
                              </div>

                              {/* Task Description */}
                              {task.description && (
                                <p className={`text-xs mb-3 line-clamp-2 transition-colors duration-300 ${
                                  isDarkMode ? 'text-white' : 'text-gray-600'
                                }`}>
                                  {task.description}
                                </p>
                              )}

                              {/* Task Tags */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {task.tags.map((tag, tagIndex) => (
                                    <Badge key={tagIndex} variant="outline" className="text-xs">
                                      <Tag className="w-2 h-2 mr-1" />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}

                              {/* Stock Link */}
                              {task.stockId && (
                                <div className="flex items-center gap-1 mb-3">
                                  <Car className="w-3 h-3 text-blue-500" />
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                  }`}>
                                    Stock: {task.stockId}
                                  </span>
                                </div>
                              )}

                              {/* Task Footer */}
                              <div className={`flex items-center justify-between text-xs transition-colors duration-300 ${
                                isDarkMode ? 'text-white' : 'text-gray-500'
                              }`}>
                                <div className="flex items-center gap-3">
                                  {task.dueDate && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {new Date(task.dueDate).toLocaleDateString()}
                                    </div>
                                  )}
                                  {task.estimatedHours && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {task.estimatedHours}h
                                    </div>
                                  )}
                                </div>
                                {task.assignedTo && (
                                  <div className="flex items-center gap-1" title={`Assigned to: ${getAssignedUserName(task.assignedTo)}`}>
                                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-sm">
                                      {getAssignedUserInitials(task.assignedTo)}
                                    </div>
                                  </div>
                                )}
                              </div>
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
                      onClick={() => openAddTaskDialog(column.id, column.name)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          ))}

          {/* Add Column Button */}
          <div className="flex-shrink-0 w-80">
            <Button 
              variant="outline" 
              className={`w-full h-32 border-2 border-dashed transition-colors duration-300 ${
                isDarkMode 
                  ? 'border-gray-600 hover:border-blue-500' 
                  : 'border-gray-300 hover:border-blue-400'
              }`}
              onClick={() => setShowAddColumnDialog(true)}
            >
              <Plus className="w-6 h-6 mr-2" />
              Add Column
            </Button>
          </div>
        </div>
      </DragDropContext>

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        onAddTask={handleAddTask}
        columnName={selectedColumnName}
      />

      {/* Add Column Dialog */}
      <AddColumnDialog
        open={showAddColumnDialog}
        onOpenChange={setShowAddColumnDialog}
        onAddColumn={handleAddColumn}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        open={showEditTaskDialog}
        onOpenChange={setShowEditTaskDialog}
        task={selectedTask}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />

      {/* Edit Column Dialog */}
      {selectedColumn && (
        <EditColumnDialog
          open={showEditColumnDialog}
          onOpenChange={(open) => {
            setShowEditColumnDialog(open);
            if (!open) {
              setSelectedColumn(null);
            }
          }}
          column={selectedColumn}
          onUpdateColumn={handleUpdateColumn}
          onDeleteColumn={handleDeleteColumn}
        />
      )}

      {/* Column Settings Dialog */}
      {selectedColumn && (
        <ColumnSettingsDialog
          open={showColumnSettingsDialog}
          onOpenChange={(open) => {
            setShowColumnSettingsDialog(open);
            if (!open) {
              setSelectedColumn(null);
            }
          }}
          column={selectedColumn}
          onUpdateColumn={handleUpdateColumn}
        />
      )}
    </div>
  );
}
