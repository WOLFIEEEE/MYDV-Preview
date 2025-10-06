"use client";

import React, { useState } from 'react';
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
import { Columns, Palette } from "lucide-react";

interface AddColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddColumn: (columnData: {
    name: string;
    color: string;
    limitWip?: number;
  }) => void;
}

const predefinedColors = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Gray', value: '#6b7280' },
];

export default function AddColumnDialog({ 
  open, 
  onOpenChange, 
  onAddColumn 
}: AddColumnDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#6b7280',
    limitWip: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    onAddColumn({
      name: formData.name.trim(),
      color: formData.color,
      limitWip: formData.limitWip ? parseInt(formData.limitWip) : undefined,
    });

    // Reset form
    setFormData({
      name: '',
      color: '#6b7280',
      limitWip: '',
    });

    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: '',
      color: '#6b7280',
      limitWip: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns className="w-5 h-5 text-blue-600" />
            Add New Column
          </DialogTitle>
          <DialogDescription>
            Create a new column for your Kanban board to organize tasks
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Column Name *</Label>
            <Input
              id="name"
              placeholder="e.g., In Review, Testing, Done..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Column Color
            </Label>
            <div className="grid grid-cols-4 gap-2">
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

          {/* WIP Limit */}
          <div className="space-y-2">
            <Label htmlFor="limitWip">
              WIP Limit (Optional)
            </Label>
            <Input
              id="limitWip"
              type="number"
              placeholder="e.g., 5"
              min="1"
              max="50"
              value={formData.limitWip}
              onChange={(e) => setFormData({ ...formData, limitWip: e.target.value })}
            />
            <p className="text-xs text-gray-500 dark:text-white">
              Work In Progress limit - maximum number of tasks allowed in this column
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name.trim()}>
              Create Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
