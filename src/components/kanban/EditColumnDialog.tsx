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
import { Edit3, Palette, ArrowLeft, ArrowRight, Trash2 } from "lucide-react";

interface EditColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: {
    id: string;
    name: string;
    color: string;
    description?: string;
    position: number;
  };
  onUpdateColumn: (columnId: string, columnData: {
    name?: string;
    color?: string;
    description?: string;
    position?: number;
  }) => void;
  onDeleteColumn?: (columnId: string) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  onMoveColumn?: (columnId: string, direction: 'left' | 'right') => void;
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

export default function EditColumnDialog({ 
  open, 
  onOpenChange, 
  column,
  onUpdateColumn,
  onDeleteColumn,
  canMoveLeft,
  canMoveRight,
  onMoveColumn
}: EditColumnDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    description: '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Update form data when column changes
  useEffect(() => {
    if (column) {
      setFormData({
        name: column.name,
        color: column.color,
        description: column.description || '',
      });
    }
    setShowDeleteConfirm(false);
  }, [column]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    onUpdateColumn(column.id, {
      name: formData.name.trim(),
      color: formData.color,
      description: formData.description.trim() || undefined,
    });

    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (column) {
      setFormData({
        name: column.name,
        color: column.color,
        description: column.description || '',
      });
    }
    setShowDeleteConfirm(false);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDeleteColumn) {
      onDeleteColumn(column.id);
      onOpenChange(false);
    }
  };

  const handleMove = (direction: 'left' | 'right') => {
    if (onMoveColumn) {
      onMoveColumn(column.id, direction);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-blue-600" />
            Edit Column
          </DialogTitle>
          <DialogDescription>
            Update the details and appearance of the "{column?.name}" column
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="columnName">Column Name</Label>
            <Input
              id="columnName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter column name"
              required
            />
          </div>

          {/* Column Description */}
          <div className="space-y-2">
            <Label htmlFor="columnDescription">Description (Optional)</Label>
            <Textarea
              id="columnDescription"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this column represents..."
              rows={3}
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Palette className="w-4 h-4" />
              Column Color
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

          {/* Column Position Controls */}
          {(onMoveColumn && (canMoveLeft || canMoveRight)) && (
            <div className="space-y-2">
              <Label>Column Position</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleMove('left')}
                  disabled={!canMoveLeft}
                  className="flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Move Left
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleMove('right')}
                  disabled={!canMoveRight}
                  className="flex-1"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move Right
                </Button>
              </div>
            </div>
          )}

          {/* Delete Section */}
          {onDeleteColumn && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Label className="text-red-600 dark:text-red-400">Danger Zone</Label>
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Column
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Are you sure? This will permanently delete the column and all its tasks.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
