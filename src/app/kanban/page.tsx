"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Kanban as KanbanIcon,
  Plus,
  Settings,
  RefreshCw,
  Grid3X3,
  Loader2
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import VehicleJobCardsBoard from "@/components/kanban/VehicleJobCardsBoard";
import BoardSettingsDialog from "@/components/kanban/BoardSettingsDialog";
import { 
  useKanbanBoardsQuery, 
  useCreateBoardMutation, 
  useUpdateBoardMutation, 
  useDeleteBoardMutation 
} from "@/hooks/useKanbanQuery";

// Component that uses useSearchParams
function KanbanPageContent() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();
  
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showBoardSettings, setShowBoardSettings] = useState(false);

  // React Query hooks
  const { 
    data: boards, 
    loading: boardsLoading, 
    error: boardsError, 
    refetch: refetchBoards 
  } = useKanbanBoardsQuery(isSignedIn && isLoaded);

  const createBoardMutation = useCreateBoardMutation();
  const updateBoardMutation = useUpdateBoardMutation();
  const deleteBoardMutation = useDeleteBoardMutation();

  // Authentication check
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!isSignedIn) {
      router.replace('/sign-in');
      return;
    }
  }, [isLoaded, isSignedIn, router]);

  // Auto-select board based on URL parameter or default board
  useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) {
      // Check if there's a board parameter in the URL
      const boardParam = searchParams.get('board');
      
      let boardToSelect = null;
      
      if (boardParam) {
        // Try to find board by ID first
        boardToSelect = boards.find(board => board.id === boardParam);
        
        // If not found by ID, try to find by name
        if (!boardToSelect) {
          boardToSelect = boards.find(board => 
            board.name.toLowerCase().replace(/\s+/g, '-') === boardParam.toLowerCase()
          );
        }
      }
      
      // If no board found from URL param, use default logic
      if (!boardToSelect) {
        const defaultBoard = boards.find(board => board.isDefault);
        boardToSelect = defaultBoard || boards[0];
      }
      
      if (boardToSelect) {
        setSelectedBoardId(boardToSelect.id);
      }
    }
  }, [boards, selectedBoardId, searchParams]);

  // Create new board
  const createBoard = async () => {
    try {
      const result = await createBoardMutation.mutateAsync({
        name: `New Board ${boards.length + 1}`,
        description: 'A new Kanban board for task management',
        color: '#3b82f6',
      });
      setSelectedBoardId(result.id);
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  // Update board
  const updateBoard = async (boardData: {
    name: string;
    description?: string;
    color: string;
  }) => {
    if (!selectedBoardId) return;

    try {
      await updateBoardMutation.mutateAsync({
        boardId: selectedBoardId,
        boardData,
      });
    } catch (error) {
      console.error('Error updating board:', error);
    }
  };

  // Delete board
  const deleteBoard = async () => {
    if (!selectedBoardId) return;

    try {
      await deleteBoardMutation.mutateAsync(selectedBoardId);
      
      // Select first remaining board or null
      const remainingBoards = boards.filter(board => board.id !== selectedBoardId);
      setSelectedBoardId(remainingBoards.length > 0 ? remainingBoards[0].id : null);
      setShowBoardSettings(false);
    } catch (error) {
      console.error('Error deleting board:', error);
    }
  };

  // Get selected board
  const selectedBoard = boards.find(board => board.id === selectedBoardId);

  // Don't show anything if not loaded or not signed in
  if (!isLoaded || !isSignedIn) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <Header />
        <div className="pt-16 pb-6">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className={`w-8 h-8 animate-spin mx-auto mb-4 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <h3 className={`text-xl font-semibold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Loading Kanban Workspace
                </h3>
                <p className={isDarkMode ? 'text-white' : 'text-slate-600'}>
                  Setting up your task management workspace...
                </p>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-900' : 'bg-slate-50'
    }`}>
      <Header />
      
      <div className="pt-16 pb-6">
        {/* Page Header */}
        <section className={`w-full border-b transition-colors duration-300 ${
          isDarkMode 
            ? 'border-slate-700 bg-slate-800' 
            : 'border-slate-200 bg-white'
        }`}>
          <div className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <KanbanIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`text-2xl md:text-3xl font-bold transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Kanban Boards
                  </h1>
                  <p className={`text-sm md:text-base transition-colors duration-300 ${
                    isDarkMode ? 'text-white' : 'text-gray-600'
                  }`}>
                    Organize and track your tasks with visual project management
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {selectedBoard && !boardsLoading && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBoardSettings(true)}
                    disabled={updateBoardMutation.isPending || deleteBoardMutation.isPending}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Board Settings
                  </Button>
                )}
                <Button 
                  onClick={createBoard} 
                  size="sm"
                  disabled={createBoardMutation.isPending}
                >
                  {createBoardMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  New Board
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Board Selection & Content */}
        <section className="container mx-auto max-w-full px-4 lg:px-6 xl:px-8 py-6">
          {/* Show loading state for boards */}
          {boardsLoading ? (
            <div className="text-center py-16">
              <div className={`w-16 h-16 border-4 ${
                isDarkMode 
                  ? 'border-slate-700 border-t-blue-400' 
                  : 'border-slate-200 border-t-blue-600'
              } rounded-full animate-spin mx-auto mb-6`}></div>
              <div className="space-y-2">
                <h3 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-700'
                }`}>
                  Loading Kanban Boards
                </h3>
                <p className={`${
                  isDarkMode ? 'text-white' : 'text-slate-500'
                }`}>
                  Setting up your task management workspace...
                </p>
              </div>
            </div>
          ) : boardsError ? (
            // Error State
            <div className="text-center py-16">
              <div className={`w-24 h-24 ${
                isDarkMode ? 'bg-red-900/20' : 'bg-red-100'
              } rounded-full flex items-center justify-center mx-auto mb-6`}>
                <KanbanIcon className="w-12 h-12 text-red-500" />
              </div>
              <h3 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              } mb-2`}>
                Error Loading Kanban Boards
              </h3>
              <p className={`${
                isDarkMode ? 'text-white' : 'text-gray-600'
              } mb-6 max-w-md mx-auto`}>
                {boardsError}
              </p>
              <Button onClick={() => refetchBoards()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : boards.length === 0 ? (
            // Empty State
            <div className="text-center py-16">
              <div className={`w-24 h-24 ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              } rounded-full flex items-center justify-center mx-auto mb-6`}>
                <Grid3X3 className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              } mb-2`}>
                No Kanban Boards Yet
              </h3>
              <p className={`${
                isDarkMode ? 'text-white' : 'text-gray-600'
              } mb-6 max-w-md mx-auto`}>
                Create your first Kanban board to start organizing tasks and managing your workflow visually.
              </p>
              <Button 
                onClick={createBoard}
                disabled={createBoardMutation.isPending}
              >
                {createBoardMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Your First Board
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Board Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {boards.map((board) => (
                  <Button
                    key={board.id}
                    variant={selectedBoardId === board.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedBoardId(board.id)}
                    className="flex-shrink-0"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: board.color }}
                    />
                    {board.name}
                    {board.isDefault && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Default
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {/* Kanban Board */}
              {selectedBoardId && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    {selectedBoard?.name === 'Vehicle Job Cards' ? (
                      <VehicleJobCardsBoard />
                    ) : (
                      <KanbanBoard boardId={selectedBoardId} boardName={selectedBoard?.name} />
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>
      </div>
      
      <Footer />

      {/* Board Settings Dialog */}
      {selectedBoard && (
        <BoardSettingsDialog
          open={showBoardSettings}
          onOpenChange={setShowBoardSettings}
          board={selectedBoard}
          onUpdateBoard={updateBoard}
          onDeleteBoard={selectedBoard.isDefault ? undefined : deleteBoard}
        />
      )}
    </div>
  );
}

// Main export with Suspense wrapper
export default function KanbanPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading Kanban Board...</p>
        </div>
      </div>
    }>
      <KanbanPageContent />
    </Suspense>
  );
}
