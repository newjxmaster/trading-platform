import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Image, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@components/ui/Button';

// ============================================
// KYC Upload Component
// ============================================

interface KYCUploadProps {
  title: string;
  description?: string;
  accept?: string;
  maxSize?: number; // in MB
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
  preview?: string | null;
  isUploaded?: boolean;
  error?: string;
}

export const KYCUpload: React.FC<KYCUploadProps> = ({
  title,
  description,
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSize = 10,
  onFileSelect,
  onFileRemove,
  preview,
  isUploaded = false,
  error,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
    
    if (!allowedTypes.includes(fileExtension) && !allowedTypes.includes(file.type)) {
      return `File type not supported. Please upload: ${accept}`;
    }

    return null;
  };

  const handleFile = (file: File) => {
    setLocalError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setLocalError(validationError);
      return;
    }

    onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-secondary-700">
        {title}
      </label>
      
      {description && (
        <p className="text-sm text-secondary-500">{description}</p>
      )}

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all
          ${isDragging 
            ? 'border-primary-500 bg-primary-50' 
            : isUploaded 
              ? 'border-success-300 bg-success-50' 
              : 'border-secondary-300 bg-secondary-50 hover:border-primary-400 hover:bg-primary-50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        {isUploaded && preview ? (
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border border-secondary-200">
              {preview.startsWith('data:image') ? (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-secondary-100">
                  <FileText className="w-8 h-8 text-secondary-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success-500" />
                <span className="font-medium text-success-700">Uploaded successfully</span>
              </div>
              {onFileRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemove();
                  }}
                  className="mt-2 text-danger-600 hover:text-danger-700"
                  leftIcon={<X className="w-4 h-4" />}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3
              ${isDragging ? 'bg-primary-100' : 'bg-secondary-100'}
            `}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-secondary-400'}`} />
            </div>
            <p className="text-sm font-medium text-secondary-700 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-secondary-500">
              {accept.replace(/,/g, ', ')} up to {maxSize}MB
            </p>
          </div>
        )}
      </div>

      {displayError && (
        <div className="flex items-center gap-2 text-sm text-danger-600">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
};

export default KYCUpload;
