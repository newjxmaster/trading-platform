import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  RefreshCw,
  Shield,
  ArrowRight,
  Banknote,
  CreditCard
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { Modal } from '@components/ui/Modal';

// ============================================
// Bank Connection Component
// ============================================

const SUPPORTED_BANKS = [
  { id: 'ecobank', name: 'Ecobank', logo: '🏦', color: 'bg-blue-600' },
  { id: 'uba', name: 'UBA', logo: '🏛️', color: 'bg-red-600' },
  { id: 'gtbank', name: 'GTBank', logo: '🏪', color: 'bg-orange-500' },
  { id: 'access', name: 'Access Bank', logo: '🏛️', color: 'bg-purple-600' },
];

export const BankConnection: React.FC = () => {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [connectedBank, setConnectedBank] = useState<{
    bankName: string;
    accountNumber: string;
    accountName: string;
    connectedAt: string;
  } | null>(null);

  // ============================================
  // Handle Bank Selection
  // ============================================

  const handleBankSelect = (bankId: string) => {
    setSelectedBank(bankId);
    setConnectionStatus('idle');
  };

  // ============================================
  // Handle Connect
  // ============================================

  const handleConnect = async () => {
    if (!selectedBank || !accountNumber) return;
    
    setShowConsentModal(true);
  };

  // ============================================
  // Handle Consent
  // ============================================

  const handleConsent = async () => {
    setShowConsentModal(false);
    setIsConnecting(true);
    setConnectionStatus('connecting');

    // Simulate API call
    setTimeout(() => {
      setIsConnecting(false);
      setConnectionStatus('success');
      setConnectedBank({
        bankName: SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name || '',
        accountNumber: accountNumber,
        accountName: 'Business Account',
        connectedAt: new Date().toISOString(),
      });
    }, 2000);
  };

  // ============================================
  // Handle Disconnect
  // ============================================

  const handleDisconnect = () => {
    setConnectedBank(null);
    setSelectedBank(null);
    setAccountNumber('');
    setConnectionStatus('idle');
  };

  // ============================================
  // Render Connected State
  // ============================================

  if (connectedBank) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Bank Connection</h1>
          <p className="text-secondary-500 mt-1">
            Manage your connected bank account
          </p>
        </div>

        {/* Connected Card */}
        <Card className="bg-gradient-to-br from-success-500 to-success-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <Badge className="bg-white/20 text-white mb-1">Connected</Badge>
                <h2 className="text-xl font-bold">{connectedBank.bankName}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/10 rounded-lg">
                <p className="text-success-100 text-sm mb-1">Account Number</p>
                <p className="text-lg font-mono">****{connectedBank.accountNumber.slice(-4)}</p>
              </div>
              <div className="p-4 bg-white/10 rounded-lg">
                <p className="text-success-100 text-sm mb-1">Account Name</p>
                <p className="text-lg">{connectedBank.accountName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-success-100 text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>Last synced: {new Date(connectedBank.connectedAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Banknote}
            title="Auto Revenue Tracking"
            description="Daily revenue automatically synced from your bank"
          />
          <FeatureCard
            icon={RefreshCw}
            title="Real-time Updates"
            description="Transaction data updated every hour"
          />
          <FeatureCard
            icon={Shield}
            title="Secure & Private"
            description="Read-only access, bank-grade security"
          />
        </div>

        {/* Actions */}
        <Card>
          <CardHeader title="Connection Settings" />
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium text-secondary-900">Auto Sync</p>
                    <p className="text-sm text-secondary-500">Sync data automatically</p>
                  </div>
                </div>
                <Badge variant="success">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-secondary-500" />
                  <div>
                    <p className="font-medium text-secondary-900">Data Access</p>
                    <p className="text-sm text-secondary-500">Read-only permissions</p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-secondary-200">
              <Button
                variant="danger"
                onClick={handleDisconnect}
                className="w-full"
              >
                Disconnect Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // Render Connection Form
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Connect Bank Account</h1>
        <p className="text-secondary-500 mt-1">
          Link your business bank account for automatic revenue tracking
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BenefitCard
          icon={RefreshCw}
          title="Automatic Sync"
          description="Revenue data synced daily from your bank"
        />
        <BenefitCard
          icon={Shield}
          title="Bank-Grade Security"
          description="256-bit encryption, read-only access"
        />
        <BenefitCard
          icon={CheckCircle2}
          title="Verified Reports"
          description="Auto-verified revenue for investors"
        />
      </div>

      {/* Bank Selection */}
      <Card>
        <CardHeader title="Select Your Bank" />
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {SUPPORTED_BANKS.map((bank) => (
              <button
                key={bank.id}
                onClick={() => handleBankSelect(bank.id)}
                className={`p-4 border-2 rounded-xl text-center transition-all ${
                  selectedBank === bank.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-secondary-200 hover:border-secondary-300'
                }`}
              >
                <div className={`w-12 h-12 ${bank.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                  <span className="text-2xl">{bank.logo}</span>
                </div>
                <p className="font-medium text-secondary-900">{bank.name}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Details */}
      {selectedBank && (
        <Card>
          <CardHeader title="Enter Account Details" />
          <CardContent>
            <div className="max-w-md space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Account Number
                </label>
                <Input
                  placeholder="Enter your account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                />
              </div>

              {connectionStatus === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-danger-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
                  <p className="text-sm text-danger-700">
                    Failed to connect. Please check your account number and try again.
                  </p>
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleConnect}
                isLoading={isConnecting}
                disabled={!accountNumber || accountNumber.length < 10}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {isConnecting ? 'Connecting...' : 'Connect Account'}
              </Button>

              <p className="text-xs text-secondary-500 text-center">
                By connecting, you agree to allow read-only access to your transaction data.
                We never store your login credentials.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Note */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800">Secure Connection</p>
          <p className="text-sm text-blue-600">
            Your data is encrypted and secure. We only request read-only access to track 
            deposits and calculate revenue. We cannot make transactions or access sensitive 
            account information.
          </p>
        </div>
      </div>

      {/* Consent Modal */}
      <Modal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        title="Authorize Bank Access"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-secondary-50 rounded-lg">
            <Building2 className="w-10 h-10 text-secondary-400" />
            <div>
              <p className="font-medium text-secondary-900">
                {SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name}
              </p>
              <p className="text-sm text-secondary-500">Account: ****{accountNumber.slice(-4)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-secondary-900">We will access:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                Transaction history (deposits and withdrawals)
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                Account balance information
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <CheckCircle2 className="w-4 h-4 text-success-500" />
                Daily revenue calculations
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="font-medium text-secondary-900">We will NOT:</p>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <AlertCircle className="w-4 h-4 text-danger-500" />
                Make any transactions
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <AlertCircle className="w-4 h-4 text-danger-500" />
                Access login credentials
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary-600">
                <AlertCircle className="w-4 h-4 text-danger-500" />
                Share data with third parties
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowConsentModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConsent}
            >
              I Agree
            </Button>
          </div>
        </div>
      </Modal>
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
  <div className="p-4 bg-secondary-50 rounded-lg">
    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-primary-600" />
    </div>
    <h3 className="font-medium text-secondary-900 mb-1">{title}</h3>
    <p className="text-sm text-secondary-500">{description}</p>
  </div>
);

// ============================================
// Feature Card Component
// ============================================

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <Card>
    <CardContent className="p-4">
      <div className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-success-600" />
      </div>
      <h3 className="font-medium text-secondary-900 mb-1">{title}</h3>
      <p className="text-sm text-secondary-500">{description}</p>
    </CardContent>
  </Card>
);

export default BankConnection;
