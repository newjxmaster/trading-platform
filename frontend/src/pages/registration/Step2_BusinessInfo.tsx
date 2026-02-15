import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  FileText, 
  ArrowRight,
  ArrowLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';

// ============================================
// Step 2: Business Information Component
// ============================================

const BUSINESS_TYPES = [
  { value: 'small_business', label: 'Small Business' },
  { value: 'medium_business', label: 'Medium Business' },
];

const CATEGORIES = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'retail', label: 'Retail Store' },
  { value: 'factory', label: 'Factory' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'textile', label: 'Textile' },
  { value: 'other', label: 'Other' },
];

export const Step2_BusinessInfo: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    category: '',
    description: '',
    address: '',
    yearsInOperation: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): string | null => {
    if (!formData.businessName.trim()) return 'Business name is required';
    if (!formData.businessType) return 'Business type is required';
    if (!formData.category) return 'Category is required';
    if (!formData.description.trim()) return 'Description is required';
    if (formData.description.length < 50) return 'Description must be at least 50 characters';
    if (!formData.address.trim()) return 'Address is required';
    if (!formData.yearsInOperation) return 'Years in operation is required';
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
      // Store in localStorage or state management
      localStorage.setItem('registration_business_info', JSON.stringify(formData));
      navigate('/registration/step3');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step <= 2 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>
              {step < 2 ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 6 && <div className={`w-8 h-1 rounded ${step < 2 ? 'bg-primary-500' : 'bg-secondary-200'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader 
          title="Business Information"
          subtitle="Step 2 of 6 - Tell us about your business"
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

            {/* Business Name */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Business Name *
              </label>
              <Input
                type="text"
                placeholder="Enter your business name"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                leftIcon={<Building2 className="w-4 h-4" />}
              />
            </div>

            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Business Type *
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select business type</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Business Description *
              </label>
              <textarea
                placeholder="Describe your business, products/services, target market, etc. (min 50 characters)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="text-xs text-secondary-500 mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Business Address *
              </label>
              <textarea
                placeholder="Enter your business address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Years in Operation */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Years in Operation *
              </label>
              <Input
                type="number"
                placeholder="e.g., 5"
                value={formData.yearsInOperation}
                onChange={(e) => setFormData(prev => ({ ...prev, yearsInOperation: e.target.value }))}
                leftIcon={<Calendar className="w-4 h-4" />}
              />
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/registration/step1')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1"
                isLoading={isLoading}
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

export default Step2_BusinessInfo;
