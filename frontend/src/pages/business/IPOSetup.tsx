import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Users,
  Calculator,
  CheckCircle2,
  AlertCircle,
  Info,
  ArrowRight,
  ArrowLeft,
  Building2
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { useAuthStore } from '@stores/authStore';
import { companyApi } from '@services/api';
import { Company } from '@types/index';
import { formatCurrency, formatNumber } from '@utils/formatters';

// ============================================
// IPO Setup Component
// ============================================

interface IPOConfig {
  initialValuation: number;
  totalShares: number;
  publicOfferingPercent: number;
  minimumInvestment: number;
}

export const IPOSetup: React.FC = () => {
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [config, setConfig] = useState<IPOConfig>({
    initialValuation: 100000,
    totalShares: 10000,
    publicOfferingPercent: 70,
    minimumInvestment: 100,
  });

  // ============================================
  // Fetch Company
  // ============================================

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await companyApi.getAll({ filter: `owner:${user.id}` });
      if (response.data.success && response.data.data) {
        const companies = response.data.data as Company[];
        if (companies.length > 0) {
          setCompany(companies[0]);
          // Pre-fill if already configured
          if (companies[0].initialValuation) {
            setConfig({
              initialValuation: companies[0].initialValuation,
              totalShares: companies[0].totalShares,
              publicOfferingPercent: 70,
              minimumInvestment: 100,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Calculations
  // ============================================

  const sharePrice = config.initialValuation / config.totalShares;
  const publicShares = Math.round(config.totalShares * (config.publicOfferingPercent / 100));
  const retainedShares = config.totalShares - publicShares;
  const capitalRaised = publicShares * sharePrice;
  const minShares = Math.ceil(config.minimumInvestment / sharePrice);

  // ============================================
  // Handlers
  // ============================================

  const handleInputChange = (field: keyof IPOConfig, value: number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!company) return;
    
    setIsSubmitting(true);
    try {
      const response = await companyApi.update(company.id, {
        initialValuation: config.initialValuation,
        totalShares: config.totalShares,
        availableShares: publicShares,
        currentPrice: sharePrice,
      });
      
      if (response.data.success) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Error saving IPO config:', error);
    } finally {
      setIsSubmitting(false);
    }
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
  // Render Success State
  // ============================================

  if (showSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-success-600" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-900 mb-2">
              IPO Configuration Saved!
            </h2>
            <p className="text-secondary-500 mb-6">
              Your IPO details have been saved and are pending admin approval.
            </p>
            <div className="p-4 bg-secondary-50 rounded-lg text-left max-w-md mx-auto mb-6">
              <div className="flex justify-between py-2">
                <span className="text-secondary-500">Valuation</span>
                <span className="font-medium">{formatCurrency(config.initialValuation)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary-500">Share Price</span>
                <span className="font-medium">{formatCurrency(sharePrice)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary-500">Shares Offered</span>
                <span className="font-medium">{formatNumber(publicShares)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-secondary-500">Capital to Raise</span>
                <span className="font-medium text-success-600">{formatCurrency(capitalRaised)}</span>
              </div>
            </div>
            <Button onClick={() => window.location.href = '/business/profile'}>
              Go to Company Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // Render IPO Setup
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">IPO Setup</h1>
        <p className="text-secondary-500 mt-1">
          Configure your Initial Public Offering details
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              currentStep >= step
                ? 'bg-primary-500 text-white'
                : 'bg-secondary-200 text-secondary-500'
            }`}>
              {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 3 && (
              <div className={`w-16 h-1 rounded ${
                currentStep > step ? 'bg-primary-500' : 'bg-secondary-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-secondary-900">Set Your Valuation</h2>
                <p className="text-secondary-500">How much is your business worth?</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Initial Valuation (USD)
                  </label>
                  <Input
                    type="number"
                    value={config.initialValuation}
                    onChange={(e) => handleInputChange('initialValuation', parseFloat(e.target.value) || 0)}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Based on: Assets + Revenue + Growth potential
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Valuation Tips</p>
                      <ul className="text-sm text-blue-600 mt-1 space-y-1">
                        <li>• Consider your annual revenue (typically 2-5x)</li>
                        <li>• Include value of assets and inventory</li>
                        <li>• Factor in growth rate and market position</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <PieChart className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-secondary-900">Share Structure</h2>
                <p className="text-secondary-500">Define your share distribution</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Total Shares to Issue
                  </label>
                  <Input
                    type="number"
                    value={config.totalShares}
                    onChange={(e) => handleInputChange('totalShares', parseInt(e.target.value) || 0)}
                    leftIcon={<PieChart className="w-4 h-4" />}
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Suggested: 10,000 - 100,000 shares for easy trading
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Public Offering (%)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={config.publicOfferingPercent}
                      onChange={(e) => handleInputChange('publicOfferingPercent', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-16 text-right font-medium">{config.publicOfferingPercent}%</span>
                  </div>
                  <p className="text-xs text-secondary-500 mt-1">
                    Recommended: 60-80%. You retain: {100 - config.publicOfferingPercent}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Minimum Investment (USD)
                  </label>
                  <Input
                    type="number"
                    value={config.minimumInvestment}
                    onChange={(e) => handleInputChange('minimumInvestment', parseFloat(e.target.value) || 0)}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Suggested: $10 - $100 to encourage small investors
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator className="w-8 h-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-secondary-900">Review & Confirm</h2>
                <p className="text-secondary-500">Verify your IPO configuration</p>
              </div>

              <div className="p-6 bg-secondary-50 rounded-xl space-y-4">
                <h3 className="font-semibold text-secondary-900 mb-4">IPO Summary</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-secondary-500">Initial Valuation</p>
                    <p className="text-lg font-bold text-secondary-900">
                      {formatCurrency(config.initialValuation)}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-secondary-500">Share Price</p>
                    <p className="text-lg font-bold text-secondary-900">
                      {formatCurrency(sharePrice)}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-secondary-500">Total Shares</p>
                    <p className="text-lg font-bold text-secondary-900">
                      {formatNumber(config.totalShares)}
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-sm text-secondary-500">Public Offering</p>
                    <p className="text-lg font-bold text-secondary-900">
                      {config.publicOfferingPercent}%
                    </p>
                  </div>
                </div>

                <div className="border-t border-secondary-200 pt-4 mt-4">
                  <div className="flex justify-between py-2">
                    <span className="text-secondary-500">Shares for Public</span>
                    <span className="font-medium">{formatNumber(publicShares)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-secondary-500">Shares You Retain</span>
                    <span className="font-medium">{formatNumber(retainedShares)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-secondary-500">Minimum Investment</span>
                    <span className="font-medium">{formatCurrency(config.minimumInvestment)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-secondary-500">Minimum Shares</span>
                    <span className="font-medium">{formatNumber(minShares)}</span>
                  </div>
                </div>

                <div className="p-4 bg-success-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-success-800 font-medium">Expected Capital Raised</span>
                    <span className="text-2xl font-bold text-success-600">
                      {formatCurrency(capitalRaised)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  Once submitted, your IPO will be reviewed by our team. 
                  You'll be notified once approved.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-secondary-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={isSubmitting}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirm & Submit
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IPOSetup;
