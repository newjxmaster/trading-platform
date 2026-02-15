import React, { useState } from 'react';
import { CheckCircle2, Shield, Lock, RefreshCw, CreditCard, AlertCircle } from 'lucide-react';
import { Modal } from '@components/ui/Modal';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';


// ============================================
// Bank Connect Modal Component
// ============================================

const SUPPORTED_BANKS = [
  { id: 'ecobank', name: 'Ecobank', logo: '🏦', color: 'bg-blue-600' },
  { id: 'uba', name: 'UBA', logo: '🏛️', color: 'bg-red-600' },
  { id: 'gtbank', name: 'GTBank', logo: '🏪', color: 'bg-orange-500' },
  { id: 'access', name: 'Access Bank', logo: '🏛️', color: 'bg-purple-600' },
  { id: 'societe_generale', name: 'Société Générale', logo: '🏦', color: 'bg-red-700' },
  { id: 'boa', name: 'Bank of Africa', logo: '🏛️', color: 'bg-green-600' },
];

interface BankConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (bankId: string, accountNumber: string) => Promise<void>;
}

export const BankConnectModal: React.FC<BankConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!selectedBank || !accountNumber) {
      setError('Please select a bank and enter your account number');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await onConnect(selectedBank, accountNumber);
      setIsConnected(true);
    } catch (err) {
      setError('Failed to connect bank account. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setSelectedBank('');
    setAccountNumber('');
    setIsConnected(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isConnected ? 'Account Connected' : 'Connect Bank Account'}
      size="md"
    >
      {!isConnected ? (
        <div className="space-y-6">
          {/* Benefits */}
          <div className="grid grid-cols-3 gap-2">
            <BenefitItem icon={RefreshCw} text="Auto Sync" />
            <BenefitItem icon={Shield} text="Secure" />
            <BenefitItem icon={Lock} text="Read-only" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-danger-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
              <p className="text-sm text-danger-700">{error}</p>
            </div>
          )}

          {/* Bank Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Select Your Bank
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBank(bank.id)}
                  className={`
                    p-3 border-2 rounded-lg text-center transition-all
                    ${selectedBank === bank.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                    }
                  `}
                >
                  <span className="text-2xl mb-1 block">{bank.logo}</span>
                  <span className="text-xs font-medium text-secondary-900">{bank.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Account Number
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
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-600">
              Your data is encrypted and secure. We only request read-only access 
              to track deposits and calculate revenue.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleConnect}
              isLoading={isConnecting}
              disabled={!selectedBank || accountNumber.length < 10}
            >
              Connect
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-lg font-bold text-secondary-900 mb-2">
            Bank Account Connected!
          </h3>
          <p className="text-secondary-500 mb-4">
            Your {SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name} account has been successfully connected.
          </p>
          <div className="p-3 bg-secondary-50 rounded-lg mb-4">
            <div className="flex justify-between py-1">
              <span className="text-sm text-secondary-500">Bank</span>
              <span className="text-sm font-medium">{SUPPORTED_BANKS.find(b => b.id === selectedBank)?.name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-sm text-secondary-500">Account</span>
              <span className="text-sm font-medium">****{accountNumber.slice(-4)}</span>
            </div>
          </div>
          <Button onClick={handleClose}>Done</Button>
        </div>
      )}
    </Modal>
  );
};

// ============================================
// Benefit Item Component
// ============================================

const BenefitItem: React.FC<{ icon: React.ElementType; text: string }> = ({ icon: Icon, text }) => (
  <div className="flex flex-col items-center p-2 bg-secondary-50 rounded-lg">
    <Icon className="w-4 h-4 text-primary-600 mb-1" />
    <span className="text-xs text-secondary-600">{text}</span>
  </div>
);

export default BankConnectModal;
