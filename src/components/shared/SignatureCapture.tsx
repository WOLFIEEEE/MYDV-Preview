"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Upload, Pen, Trash2, Download } from 'lucide-react';

interface SignatureCaptureProps {
  value?: string;
  onChange: (signature: string) => void;
  width?: number;
  height?: number;
  className?: string;
}

export default function SignatureCapture({ 
  value, 
  onChange, 
  width = 400, 
  height = 200, 
  className = '' 
}: SignatureCaptureProps) {
  const { isDarkMode } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value && value.startsWith('data:image')) {
      setHasSignature(true);
      loadSignatureToCanvas(value);
    }
  }, [value]);

  const loadSignatureToCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Set drawing styles
    ctx.strokeStyle = isDarkMode ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set background
    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    setupCanvas();
  }, [isDarkMode, width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'draw') return;
    
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || mode !== 'draw') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    setHasSignature(true);
    
    // Convert canvas to data URL and call onChange
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = isDarkMode ? '#1e293b' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    setHasSignature(false);
    onChange('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, etc.)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        loadSignatureToCanvas(dataUrl);
        setHasSignature(true);
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const link = document.createElement('a');
    link.download = 'signature.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Selection */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant={mode === 'draw' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('draw')}
          className="flex items-center space-x-2"
        >
          <Pen className="h-4 w-4" />
          <span>Draw</span>
        </Button>
        <Button
          type="button"
          variant={mode === 'upload' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('upload')}
          className="flex items-center space-x-2"
        >
          <Upload className="h-4 w-4" />
          <span>Upload</span>
        </Button>
      </div>

      {/* Canvas for drawing */}
      {mode === 'draw' && (
        <div className={`border-2 border-dashed rounded-lg p-4 ${
          isDarkMode 
            ? 'border-slate-600 bg-slate-800' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`border rounded cursor-crosshair ${
              isDarkMode ? 'border-slate-600' : 'border-gray-300'
            }`}
            style={{ width: '100%', maxWidth: `${width}px`, height: `${height}px` }}
          />
          <p className={`text-xs mt-2 text-center ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            Click and drag to draw your signature
          </p>
        </div>
      )}

      {/* Upload area */}
      {mode === 'upload' && (
        <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
          isDarkMode 
            ? 'border-slate-600 bg-slate-800' 
            : 'border-gray-300 bg-gray-50'
        }`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Upload className={`mx-auto h-12 w-12 mb-4 ${
            isDarkMode ? 'text-slate-400' : 'text-gray-400'
          }`} />
          <p className={`text-sm mb-2 ${
            isDarkMode ? 'text-slate-300' : 'text-gray-600'
          }`}>
            Click to upload signature image
          </p>
          <p className={`text-xs ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            PNG, JPG up to 5MB
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
          >
            Choose File
          </Button>
        </div>
      )}

      {/* Preview area for uploaded signature */}
      {mode === 'upload' && hasSignature && (
        <div className={`border rounded-lg p-4 ${
          isDarkMode ? 'border-slate-600 bg-slate-800' : 'border-gray-300 bg-gray-50'
        }`}>
          <canvas
            ref={canvasRef}
            className={`border rounded ${
              isDarkMode ? 'border-slate-600' : 'border-gray-300'
            }`}
            style={{ width: '100%', maxWidth: `${width}px`, height: `${height}px` }}
          />
        </div>
      )}

      {/* Action buttons */}
      {hasSignature && (
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearSignature}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadSignature}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </Button>
        </div>
      )}
    </div>
  );
}
