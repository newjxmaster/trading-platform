import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  FileText,
  Building2,
  User,
  CreditCard,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  Send,
  Edit2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Badge } from '@components/ui/Badge';

import { companyApi } from '@services/api';
import { formatCurrency, formatNumber } from '@utils/formatters';

// ============================================
// Step 6: Review & Submit Component
// ============================================

export const Step6_Review: React.FC = () => {
  const navigate = useNavigate();
  
  const [registrationData, setRegistrationData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Load Data
  // ============================================

  useEffect(() => {
    const account = JSON.parse(localStorage.getItem('registration_account') || '{}');
    const businessInfo = JSON.parse(localStorage.getItem('registration_business_info') || '{}');
    const bank = JSON.parse(localStorage.getItem('registration_bank') || '{}');
    const ipo = JSON.parse(localStorage.getItem('registration_ipo') || '{}');

    setRegistrationData({
      account,
      businessInfo,
      bank,
      ipo,
    });
  }, []);

  // ============================================
  // Submit Handler
  // ============================================

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Combine all registration data
      const payload = {
        ...registrationData.businessInfo,
        ...registrationData.ipo,
        bankId: registrationData.bank?.bankId,
        bankAccountNumber: registrationData.bank?.accountNumber,
      };

      const response = await companyApi.register(payload);
      
      if (response.data.success) {
        // Clear localStorage
        localStorage.removeItem('registration_account');
        localStorage.removeItem('registration_business_info');
        localStorage.removeItem('registration_bank');
        localStorage.removeItem('registration_ipo');
        
        setIsSubmitted(true);
      }
    } catch (err) {
      setError('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // Render Success State
  // ============================================

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-24 h-24 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-success-600" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">
              Registration Submitted!
            </h2>
            <p className="text-secondary-500 mb-6 max-w-md mx-auto">
              Your company registration has been submitted for review. 
              We'll notify you via email once it's approved.
            </p>
            <div className="p-4 bg-secondary-50 rounded-lg max-w-sm mx-auto mb-6">
              <div className="flex items-center justify-between py-2">
                <span className="text-secondary-500">Status</span>
                <Badge variant="warning">Pending Review</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-secondary-500">Review Time</span>
                <span className="font-medium">1-3 business days</span>
              </div>
            </div>
            <Button onClick={() => navigate('/business/profile')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // Render Review
  // ============================================

  const sharePrice = registrationData.ipo?.initialValuation / registrationData.ipo?.totalShares || 0;
  const publicShares = Math.round((registrationData.ipo?.totalShares || 0) * ((registrationData.ipo?.publicOfferingPercent || 0) / 100));
  const capitalRaised = publicShares * sharePrice;

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2, 3, 4, 5, 6].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              step <= 6 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>
              {step < 6 ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 6 && <div className="w-8 h-1 bg-primary-500 rounded" />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader 
          title="Review Your Application"
          subtitle="Step 6 of 6 - Verify all information before submitting"
        />
        <CardContent>
          <div className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-danger-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            )}

            {/* Account Information */}
            <ReviewSection
              title="Account Information"
              icon={User}
              onEdit={() => navigate('/registration/step1')}
            >
              <ReviewItem label="Full Name" value={registrationData.account?.fullName} />
              <ReviewItem label="Email" value={registrationData.account?.email} />
              <ReviewItem label="Phone" value={registrationData.account?.phone} />
            </ReviewSection>

            {/* Business Information */}
            <ReviewSection
              title="Business Information"
              icon={Building2}
              onEdit={() => navigate('/registration/step2')}
            >
              <ReviewItem label="Business Name" value={registrationData.businessInfo?.businessName} />
              <ReviewItem label="Type" value={registrationData.businessInfo?.businessType} />
              <ReviewItem label="Category" value={registrationData.businessInfo?.category} />
              <ReviewItem label="Years in Operation" value={registrationData.businessInfo?.yearsInOperation} />
            </ReviewSection>

            {/* Documents */}
            <ReviewSection
              title="Documents"
              icon={FileText}
              onEdit={() => navigate('/registration/step3')}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span className="text-sm text-secondary-600">Registration Certificate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span className="text-sm text-secondary-600">Manager ID Card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span className="text-sm text-secondary-600">Business Photo</span>
              </div>
            </ReviewSection>

            {/* Bank Account */}
            <ReviewSection
              title="Bank Account"
              icon={CreditCard}
              onEdit={() => navigate('/registration/step4')}
            >
              <ReviewItem label="Bank" value={registrationData.bank?.bankId} />
              <ReviewItem label="Account" value={`****${registrationData.bank?.accountNumber?.slice(-4)}`} />
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                <span className="text-sm text-success-600">Connected</span>
              </div>
            </ReviewSection>

            {/* IPO Configuration */}
            <ReviewSection
              title="IPO Configuration"
              icon={TrendingUp}
              onEdit={() => navigate('/registration/step5')}
            >
              <ReviewItem 
                label="Valuation" 
                value={formatCurrency(registrationData.ipo?.initialValuation)} 
              />
              <ReviewItem 
                label="Total Shares" 
                value={formatNumber(registrationData.ipo?.totalShares)} 
              />
              <ReviewItem 
                label="Share Price" 
                value={formatCurrency(sharePrice)} 
              />
              <ReviewItem 
                label="Public Offering" 
                value={`${registrationData.ipo?.publicOfferingPercent}% (${formatNumber(publicShares)} shares)`} 
              />
              <ReviewItem 
                label="Expected Capital" 
                value={formatCurrency(capitalRaised)} 
                valueClass="text-success-600 font-semibold"
              />
            </ReviewSection>

            {/* Terms */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Terms & Conditions</p>
                  <p className="text-sm text-blue-600 mt-1">
                    By submitting, you agree to our Terms of Service, Privacy Policy, and 
                    Business Listing Agreement. All information provided is accurate and 
                    you authorize verification of your business details.
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/registration/step5')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<Send className="w-4 h-4" />}
              >
                Submit Application
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// Review Section Component
// ============================================

interface ReviewSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onEdit: () => void;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ title, icon: Icon, children, onEdit }) => (
  <div className="p-4 bg-secondary-50 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-600" />
        </div>
        <h4 className="font-medium text-secondary-900">{title}</h4>
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit} leftIcon={<Edit2 className="w-3 h-3" />}>
        Edit
      </Button>
    </div>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

// ============================================
// Review Item Component
// ============================================

interface ReviewItemProps {
  label: string;
  value: string | number;
  valueClass?: string;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ label, value, valueClass }) => (
  <div className="flex justify-between py-1">
    <span className="text-sm text-secondary-500">{label}</span>
    <span className={`text-sm font-medium ${valueClass || 'text-secondary-900'}`}>
      {value || '-'}
    </span>
  </div>
);

export default Step6_Review;
