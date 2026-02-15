import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Shield,
  Lock,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';


// ============================================
// Step 4: Bank Connection Component
// ============================================

const SUPPORTED_BANKS = [
  { id: 'ecobank', name: 'Ecobank', logo: '🏦' },
  { id: 'uba', name: 'UBA', logo: '🏛️' },
  { id: 'gtbank', name: 'GTBank', logo: '🏪' },
  { id: 'access', name: 'Access Bank', logo: '🏛️' },
  { id: 'societe_generale', name: 'Société Générale', logo: '🏦' },
  { id: 'boa', name: 'Bank of Africa', logo: '🏛️' },
];

export const Step4_BankConnection: React.FC = () => {
  const navigate = useNavigate();
  
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // Validation
  // ============================================

  const validateForm = (): string | null => {
    if (!selectedBank) return 'Please select a bank';
    if (!accountNumber || accountNumber.length < 10) return 'Please enter a valid account number';
    return null;
  };

  // ============================================
  // Connect Handler
  // ============================================

  const handleConnect = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Simulate bank connection API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsConnected(true);
    } catch (err) {
      setError('Failed to connect bank account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // ============================================
  // Continue Handler
  // ============================================

  const handleContinue = () => {
    localStorage.setItem('registration_bank', JSON.stringify({
      bankId: selectedBank,
      accountNumber,
    }));
    navigate('/registration/step5');
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
              step <= 4 ? 'bg-primary-500 text-white' : 'bg-secondary-200 text-secondary-500'
            }`}>
              {step < 4 ? <CheckCircle2 className="w-5 h-5" /> : step}
            </div>
            {step < 6 && <div className={`w-8 h-1 rounded ${step < 4 ? 'bg-primary-500' : 'bg-secondary-200'}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader 
          title="Connect Bank Account"
          subtitle="Step 4 of 6 - Link your business bank account"
        />
        <CardContent>
          {!isConnected ? (
            <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-danger-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              {/* Benefits */}
              <div className="grid grid-cols-3 gap-3">
                <BenefitCard
                  icon={RefreshCw}
                  title="Auto Sync"
                  description="Daily revenue sync"
                />
                <BenefitCard
                  icon={Shield}
                  title="Secure"
                  description="Bank-grade security"
                />
                <BenefitCard
                  icon={Lock}
                  title="Read-only"
                  description="View access only"
                />
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Select Your Bank *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SUPPORTED_BANKS.map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        selectedBank === bank.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-secondary-200 hover:border-secondary-300'
                      }`}
                    >
                      <span className="text-3xl mb-2 block">{bank.logo}</span>
                      <span className="text-sm font-medium text-secondary-900">{bank.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Account Number *
                </label>
                <Input
                  type="text"
                  placeholder="Enter your account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                />
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Secure Connection</p>
                  <p className="text-sm text-blue-600">
                    Your data is encrypted and secure. We only request read-only access 
                    to track deposits and calculate revenue. We cannot make transactions.
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate('/registration/step3')}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleConnect}
                  isLoading={isConnecting}
                  disabled={!selectedBank || accountNumber.length < 10}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Connect Account
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success-600" />
              </div>
              <h3 className="text-xl font-bold text-secondary-900 mb-2">
                Bank Account Connected!
              </h3>
              <p className="text-secondary-500 mb-6">
                Your {SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name} account has been successfully connected.
              </p>
              <div className="p-4 bg-secondary-50 rounded-lg max-w-sm mx-auto mb-6">
                <div className="flex justify-between py-2">
                  <span className="text-secondary-500">Bank</span>
                  <span className="font-medium">{SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-secondary-500">Account</span>
                  <span className="font-medium">****{accountNumber.slice(-4)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-secondary-500">Status</span>
                  <Badge variant="success">Connected</Badge>
                </div>
              </div>
              <Button
                onClick={handleContinue}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================
// Benefit Card Component
// ============================================

interface BenefitCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const BenefitCard: React.FC<BenefitCardProps> = ({ icon: Icon, title, description }) => (
  <div className="p-3 bg-secondary-50 rounded-lg text-center">
    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-2">
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
    <p className="font-medium text-secondary-900 text-sm">{title}</p>
    <p className="text-xs text-secondary-500">{description}</p>
  </div>
);

export default Step4_BankConnection;
