import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Edit2, 
  Save, 
  X, 
  FileText,
  Image,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { useAuthStore } from '@stores/authStore';
import { companyApi } from '@services/api';
import { Company } from '../../types';
import { formatCurrency, formatDate, formatBusinessType } from '../../utils/formatters';

// ============================================
// Company Profile Component
// ============================================

const BUSINESS_CATEGORIES = [
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

export const CompanyProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    category: '',
    address: '',
    yearsInOperation: 0,
  });

  // ============================================
  // Fetch Company Data
  // ============================================

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get company by owner ID - assuming the first company owned by user
      const response = await companyApi.getAll({ filter: `owner:${user.id}` });
      if (response.data.success && response.data.data) {
        const companies = response.data.data as Company[];
        if (companies.length > 0) {
          setCompany(companies[0]);
          setFormData({
            businessName: companies[0].businessName,
            description: companies[0].description || '',
            category: companies[0].category || '',
            address: '', // Would come from company data
            yearsInOperation: 0, // Would come from company data
          });
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      setError('Failed to load company profile');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Form Handlers
  // ============================================

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!company) return;
    
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await companyApi.update(company.id, formData);
      if (response.data.success) {
        setCompany(response.data.data as Company);
        setSuccessMessage('Profile updated successfully');
        setIsEditing(false);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error updating company:', error);
      setError('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (company) {
      setFormData({
        businessName: company.businessName,
        description: company.description || '',
        category: company.category || '',
        address: '',
        yearsInOperation: 0,
      });
    }
    setIsEditing(false);
    setError(null);
  };

  // ============================================
  // Render Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ============================================
  // Render No Company State
  // ============================================

  if (!company) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-20 h-20 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-10 h-10 text-secondary-400" />
        </div>
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          No Company Found
        </h2>
        <p className="text-secondary-500 mb-6">
          You haven't registered a company yet. Start the registration process to list your business.
        </p>
        <Button onClick={() => navigate('/registration/step1')}>
          Register Company
        </Button>
      </div>
    );
  }

  // ============================================
  // Render Company Profile
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Company Profile</h1>
          <p className="text-secondary-500 mt-1">
            Manage your business information and public profile
          </p>
        </div>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              leftIcon={<X className="w-4 h-4" />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-success-50 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-success-500" />
          <p className="text-success-700">{successMessage}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-danger-50 rounded-lg">
          <AlertCircle className="w-5 h-5 text-danger-500" />
          <p className="text-danger-700">{error}</p>
        </div>
      )}

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader title="Business Information" />
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Business Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                  />
                ) : (
                  <p className="text-secondary-900">{company.businessName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Business Type
                </label>
                <p className="text-secondary-900">{formatBusinessType(company.businessType)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Category
                </label>
                {isEditing ? (
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select Category</option>
                    {BUSINESS_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-secondary-900 capitalize">{company.category || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe your business..."
                  />
                ) : (
                  <p className="text-secondary-600">{company.description || 'No description provided'}</p>
                )}
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Years in Operation
                  </label>
                  <Input
                    type="number"
                    value={formData.yearsInOperation}
                    onChange={(e) => handleInputChange('yearsInOperation', parseInt(e.target.value))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader title="Documents" />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <DocumentCard
                  title="Registration Certificate"
                  status={company.registrationCertificateUrl ? 'uploaded' : 'missing'}
                  icon={FileText}
                />
                <DocumentCard
                  title="Manager ID Card"
                  status={company.managerIdCardUrl ? 'uploaded' : 'missing'}
                  icon={FileText}
                />
                <DocumentCard
                  title="Business Photo"
                  status={company.businessPhotoUrl ? 'uploaded' : 'missing'}
                  icon={Image}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Verification</span>
                <Badge variant={company.verificationStatus === 'approved' ? 'success' : 'warning'}>
                  {company.verificationStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Listing Status</span>
                <Badge variant={company.listingStatus === 'active' ? 'success' : 'default'}>
                  {company.listingStatus}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Bank Connected</span>
                <Badge variant={company.bankApiConnected ? 'success' : 'danger'}>
                  {company.bankApiConnected ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="IPO Details" />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Initial Valuation</span>
                <span className="font-medium">{formatCurrency(company.initialValuation)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Total Shares</span>
                <span className="font-medium">{company.totalShares.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Current Price</span>
                <span className="font-medium">{formatCurrency(company.currentPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">IPO Date</span>
                <span className="font-medium">{formatDate(company.ipoDate)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Bank Information" />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Bank Name</span>
                <span className="font-medium">{company.partnerBankName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-500">Account Number</span>
                <span className="font-medium">
                  ****{company.bankAccountNumber.slice(-4)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Document Card Component
// ============================================

interface DocumentCardProps {
  title: string;
  status: 'uploaded' | 'missing' | 'pending';
  icon: React.ElementType;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ title, status, icon: Icon }) => (
  <div className={`p-4 rounded-lg border-2 ${
    status === 'uploaded' 
      ? 'border-success-200 bg-success-50' 
      : 'border-secondary-200 bg-secondary-50'
  }`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        status === 'uploaded' ? 'bg-success-100' : 'bg-secondary-100'
      }`}>
        <Icon className={`w-5 h-5 ${
          status === 'uploaded' ? 'text-success-600' : 'text-secondary-400'
        }`} />
      </div>
      <Badge variant={status === 'uploaded' ? 'success' : 'default'}>
        {status}
      </Badge>
    </div>
    <p className="text-sm font-medium text-secondary-900">{title}</p>
  </div>
);

export default CompanyProfile;
