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
import { Badge } from "@/components/ui/badge";
import { Settings, Palette, Trash2, Edit3, Users, Eye, Archive } from "lucide-react";

interface BoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: {
    id: string;
    name: string;
    description?: string;
    color: string;
    isDefault: boolean;
  };
  onUpdateBoard: (boardData: {
    name: string;
    description?: string;
    color: string;
  }) => void;
  onDeleteBoard?: () => void;
  onArchiveBoard?: () => void;
}

const predefinedColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Gray', value: '#6b7280' },
];

export default function BoardSettingsDialog({ 
  open, 
  onOpenChange, 
  board,
  onUpdateBoard,
  onDeleteBoard,
  onArchiveBoard
}: BoardSettingsDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  const [activeTab, setActiveTab] = useState<'general' | 'permissions' | 'danger'>('general');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update form data when board changes
  useEffect(() => {
    if (board) {
      setFormData({
        name: board.name,
        description: board.description || '',
        color: board.color,
      });
    }
    // Reset confirmation state when board changes
    setShowDeleteConfirm(false);
  }, [board]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    // Prevent editing Vehicle Job Cards or Dealership Tasks board names
    const updatedData = {
      name: (board.name === 'Vehicle Job Cards' || board.name === 'Dealership Tasks') ? board.name : formData.name.trim(),
      description: formData.description.trim() || undefined,
      color: formData.color,
    };

    onUpdateBoard(updatedData);

    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (board) {
      setFormData({
        name: board.name,
        description: board.description || '',
        color: board.color,
      });
    }
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Board Settings
            {board?.isDefault && (
              <Badge variant="secondary" className="text-xs">Default</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Manage your Kanban board settings and preferences
          </DialogDescription>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('general')}
          >
            <Edit3 className="w-4 h-4 inline mr-1" />
            General
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'permissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-300'
            }`}
            onClick={() => setActiveTab('permissions')}
          >
            <Users className="w-4 h-4 inline mr-1" />
            Access
          </button>
          {!board?.isDefault && board?.name !== 'Vehicle Job Cards' && board?.name !== 'Dealership Tasks' && (
            <button
              type="button"
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'danger'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-300'
              }`}
              onClick={() => setActiveTab('danger')}
            >
              <Trash2 className="w-4 h-4 inline mr-1" />
              Danger Zone
            </button>
          )}
        </div>

        <div className="mt-4">
          {/* General Tab */}
          {activeTab === 'general' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Board Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Board Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter board name..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={board?.name === 'Vehicle Job Cards' || board?.name === 'Dealership Tasks'}
                  required
                />
                {(board?.name === 'Vehicle Job Cards' || board?.name === 'Dealership Tasks') && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This is a fixed board and cannot be renamed.
                  </p>
                )}
              </div>

              {/* Board Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  placeholder="Add board description (optional)..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  rows={3}
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Palette className="w-3 h-3" />
                  Board Color
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-full h-10 rounded-md border-2 transition-all hover:scale-105 ${
                        formData.color === color.value 
                          ? 'border-gray-900 dark:border-white shadow-md' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      title={color.name}
                    >
                      {formData.color === color.value && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.name.trim()}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Board Visibility</h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                  This board is visible to all team members in your dealership.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <span className="text-sm">Store Owner</span>
                    <Badge variant="default" className="text-xs">Full Access</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <span className="text-sm">Dealer Admin</span>
                    <Badge variant="default" className="text-xs">Full Access</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <span className="text-sm">Sales Representative</span>
                    <Badge variant="secondary" className="text-xs">View & Edit</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                    <span className="text-sm">Employee</span>
                    <Badge variant="outline" className="text-xs">View Only</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && !board?.isDefault && !showDeleteConfirm && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Danger Zone</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  These actions are irreversible. Please proceed with caution.
                </p>
                
                <div className="space-y-3">
                  {onArchiveBoard && (
                    <div className="flex items-center justify-between p-3 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">Archive Board</h5>
                        <p className="text-sm text-gray-600 dark:text-white">
                          Hide this board from view but keep all data
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={onArchiveBoard}>
                        <Archive className="w-4 h-4 mr-1" />
                        Archive
                      </Button>
                    </div>
                  )}
                  
                  {onDeleteBoard && (
                    <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg">
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">Delete Board</h5>
                        <p className="text-sm text-gray-600 dark:text-white">
                          Permanently delete this board and all its tasks
                        </p>
                      </div>
                      <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {activeTab === 'danger' && showDeleteConfirm && onDeleteBoard && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="font-medium text-red-900 dark:text-red-100 mb-2">Confirm Board Deletion</h4>
                <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                  Are you sure you want to delete "{board?.name}"? This will permanently delete the board and all its columns and tasks. This action cannot be undone.
                </p>
                
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => {
                      onDeleteBoard();
                      setShowDeleteConfirm(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Yes, Delete Board
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
