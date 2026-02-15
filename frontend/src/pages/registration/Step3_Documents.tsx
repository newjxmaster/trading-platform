import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Upload, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  X,
  Image as ImageIcon,
  User
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { KYCUpload } from '@components/forms/KYCUpload';

// ============================================
// Step 3: Document Upload Component
// ============================================

interface DocumentFile {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
}

export const Step3_Documents: React.FC = () => {
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState({
    registrationCertificate: { file: null, preview: null, uploaded: false } as DocumentFile,
    managerIdCard: { file: null, preview: null, uploaded: false } as DocumentFile,
    businessPhoto: { file: null, preview: null, uploaded: false } as DocumentFile,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // File Handlers
  // ============================================

  const handleFileSelect = (type: keyof typeof documents, file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => ({
        ...prev,
        [type]: {
          file,
          preview: reader.result as string,
          uploaded: true,
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = (type: keyof typeof documents) => {
    setDocuments(prev => ({
      ...prev,
      [type]: { file: null, preview: null, uploaded: false }
    }));
  };

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): string | null => {
    if (!documents.registrationCertificate.uploaded) return 'Registration certificate is required';
    if (!documents.managerIdCard.uploaded) return 'Manager ID card is required';
    if (!documents.businessPhoto.uploaded) return 'Business photo is required';
    return null;
  };

  // ============================================
  // Submit Handler
  // ============================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload files to server
      const formData = new FormData();
      if (documents.registrationCertificate.file) {
        formData.append('registrationCertificate', documents.registrationCertificate.file);
      }
      if (documents.managerIdCard.file) {
        formData.append('managerIdCard', documents.managerIdCard.file);
      }
      if (documents.businessPhoto.file) {
        formData.append('businessPhoto', documents.businessPhoto.file);
      }

      // API call would go here
      // await api.uploadDocuments(formData);

      navigate('/registration/step4');
    } catch (err) {
      setError('Failed to upload documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  const allUploaded = Object.values(documents).every(d => d.uploaded);

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step <= 3 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>
              {step < 3 ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 6 && <div className={`w-8 h-1 rounded ${step < 3 ? 'bg-primary-500' : 'bg-secondary-200'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader 
          title="Upload Documents"
          subtitle="Step 3 of 6 - Required documents for verification"
        />
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-danger-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            )}

            {/* Document Uploads */}
            <div className="space-y-6">
              {/* Registration Certificate */}
              <DocumentUpload
                title="Business Registration Certificate"
                description="Upload your official business registration document (PDF, JPG, PNG)"
                icon={FileText}
                acceptedTypes=".pdf,.jpg,.jpeg,.png"
                document={documents.registrationCertificate}
                onSelect={(file) => handleFileSelect('registrationCertificate', file)}
                onRemove={() => handleRemoveFile('registrationCertificate')}
              />

              {/* Manager ID Card */}
              <DocumentUpload
                title="Manager/Owner ID Card"
                description="Upload a valid government-issued ID (Passport, National ID, Driver's License)"
                icon={User}
                acceptedTypes=".jpg,.jpeg,.png"
                document={documents.managerIdCard}
                onSelect={(file) => handleFileSelect('managerIdCard', file)}
                onRemove={() => handleRemoveFile('managerIdCard')}
              />

              {/* Business Photo */}
              <DocumentUpload
                title="Business Photo"
                description="Upload a clear photo of your business premises or storefront"
                icon={ImageIcon}
                acceptedTypes=".jpg,.jpeg,.png"
                document={documents.businessPhoto}
                onSelect={(file) => handleFileSelect('businessPhoto', file)}
                onRemove={() => handleRemoveFile('businessPhoto')}
              />
            </div>

            {/* Progress */}
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-secondary-600">Upload Progress</span>
                <span className="text-sm font-medium text-secondary-900">
                  {Object.values(documents).filter(d => d.uploaded).length}/3
                </span>
              </div>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${(Object.values(documents).filter(d => d.uploaded).length / 3) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/registration/step2')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isLoading={isLoading}
                disabled={!allUploaded}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// Document Upload Component
// ============================================

interface DocumentUploadProps {
  title: string;
  description: string;
  icon: React.ElementType;
  acceptedTypes: string;
  document: DocumentFile;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  title,
  description,
  icon: Icon,
  acceptedTypes,
  document,
  onSelect,
  onRemove,
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSelect(file);
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${
      document.uploaded 
        ? 'border-success-200 bg-success-50' 
        : 'border-dashed border-secondary-300 bg-secondary-50 hover:border-primary-400 hover:bg-primary-50'
    } transition-colors`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
          document.uploaded ? 'bg-success-100' : 'bg-primary-100'
        }`}>
          {document.uploaded ? (
            <CheckCircle2 className="w-6 h-6 text-success-600" />
          ) : (
            <Icon className="w-6 h-6 text-primary-600" />
          )}
        </div>
        
        <div className="flex-1">
          <h4 className="font-medium text-secondary-900">{title}</h4>
          <p className="text-sm text-secondary-500 mt-1">{description}</p>
          
          {document.uploaded ? (
            <div className="mt-3 flex items-center gap-3">
              {document.preview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white">
                  <img 
                    src={document.preview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-success-600 font-medium">Uploaded successfully</p>
                <p className="text-xs text-secondary-500">{document.file?.name}</p>
              </div>
              <button
                type="button"
                onClick={onRemove}
                className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleClick}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white border border-secondary-300 rounded-lg text-sm font-medium text-secondary-700 hover:bg-secondary-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </button>
          )}
        </div>
      </div>
      
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default Step3_Documents;
