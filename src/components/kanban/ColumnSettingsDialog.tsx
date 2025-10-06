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
import { Switch } from "@/components/ui/switch";
import { Settings, Palette, Target, AlertTriangle } from "lucide-react";

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: {
    id: string;
    name: string;
    color: string;
    limitWip?: number;
    position: number;
  };
  onUpdateColumn: (columnId: string, columnData: {
    name?: string;
    color?: string;
    limitWip?: number | null;
    position?: number;
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
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Gray', value: '#6b7280' },
];

export default function ColumnSettingsDialog({ 
  open, 
  onOpenChange, 
  column,
  onUpdateColumn
}: ColumnSettingsDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#3b82f6',
    limitWip: '',
    enableWipLimit: false,
  });

  // Update form data when column changes
  useEffect(() => {
    if (column) {
      setFormData({
        name: column.name,
        color: column.color,
        limitWip: column.limitWip?.toString() || '',
        enableWipLimit: !!column.limitWip,
      });
    }
  }, [column]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    const updateData: {
      name?: string;
      color?: string;
      limitWip?: number | null;
    } = {
      name: formData.name.trim(),
      color: formData.color,
    };

    if (formData.enableWipLimit && formData.limitWip) {
      updateData.limitWip = parseInt(formData.limitWip);
    } else {
      updateData.limitWip = null;
    }

    onUpdateColumn(column.id, updateData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (column) {
      setFormData({
        name: column.name,
        color: column.color,
        limitWip: column.limitWip?.toString() || '',
        enableWipLimit: !!column.limitWip,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Column Settings
          </DialogTitle>
          <DialogDescription>
            Configure settings for the "{column?.name}" column
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

          {/* WIP Limit Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  Work In Progress (WIP) Limit
                </Label>
                <p className="text-sm text-gray-500 dark:text-white">
                  Limit the number of tasks allowed in this column
                </p>
              </div>
              <Switch
                checked={formData.enableWipLimit}
                onCheckedChange={(checked) => setFormData({ 
                  ...formData, 
                  enableWipLimit: checked,
                  limitWip: checked ? formData.limitWip : ''
                })}
              />
            </div>

            {formData.enableWipLimit && (
              <div className="space-y-2">
                <Label htmlFor="wipLimit">Maximum Tasks</Label>
                <Input
                  id="wipLimit"
                  type="number"
                  placeholder="e.g., 5"
                  min="1"
                  max="50"
                  value={formData.limitWip}
                  onChange={(e) => setFormData({ ...formData, limitWip: e.target.value })}
                  required={formData.enableWipLimit}
                />
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    When the limit is reached, the column will be highlighted and new tasks cannot be added until some are moved or completed.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Save Settings
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
