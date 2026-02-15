import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Smartphone,
  Building2,
  Bitcoin,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/Tabs';
import { Modal } from '@components/ui/Modal';
import { Badge } from '@components/ui/Badge';

import { TransactionList } from '@components/trading/TransactionList';
import { useWalletStore } from '@stores/walletStore';

import { paymentApi } from '@services/api';
import { Transaction, PaymentMethod } from '../../types';
import { formatCurrency, formatCrypto } from '../../utils/formatters';
import { copyToClipboard } from '@utils/helpers';

// ============================================
// Wallet Page Component
// ============================================

const PAYMENT_METHODS = [
  { id: 'wave', name: 'Wave', icon: Smartphone, color: 'bg-blue-500', fee: '1%' },
  { id: 'orange_money', name: 'Orange Money', icon: Smartphone, color: 'bg-orange-500', fee: '1%' },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard, color: 'bg-purple-500', fee: '2.9% + $0.30' },
  { id: 'bank_transfer', name: 'Bank Transfer', icon: Building2, color: 'bg-green-500', fee: 'Free' },
  { id: 'crypto', name: 'Cryptocurrency', icon: Bitcoin, color: 'bg-yellow-500', fee: 'Network fees' },
] as const;

const CRYPTO_OPTIONS = [
  { id: 'USDT', name: 'Tether (USDT)', network: 'ERC-20' },
  { id: 'USDC', name: 'USD Coin (USDC)', network: 'ERC-20' },
  { id: 'BTC', name: 'Bitcoin (BTC)', network: 'Bitcoin' },
  { id: 'ETH', name: 'Ethereum (ETH)', network: 'ERC-20' },
];

export const WalletPage: React.FC = () => {
  const location = useLocation();
  
  const { balance, fetchBalance } = useWalletStore();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Deposit state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // Withdrawal state
  const [_showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState<PaymentMethod>('bank_transfer');
  const [withdrawAccount, setWithdrawAccount] = useState('');

  // ============================================
  // Fetch Data
  // ============================================

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
    
    // Check if we should open deposit tab from navigation state
    if (location.state?.tab === 'deposit') {
      setActiveTab('deposit');
    }
  }, [fetchBalance, location.state]);

  const fetchTransactions = async () => {
    try {
      const response = await paymentApi.getTransactions({ page: 1, limit: 50 });
      if (response.data.success && response.data.data) {
        setTransactions(response.data.data as Transaction[]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // ============================================
  // Deposit Handlers
  // ============================================

  const handleDeposit = async () => {
    if (!selectedMethod || !depositAmount) return;
    
    setIsLoading(true);
    try {
      const response = await paymentApi.deposit({
        amount: parseFloat(depositAmount),
        currency: 'USD',
        paymentMethod: selectedMethod,
        phone: depositPhone,
        cryptoCurrency: selectedCrypto,
      });
      
      if (response.data.success) {
        setShowDepositModal(false);
        setDepositAmount('');
        setDepositPhone('');
        fetchBalance();
        fetchTransactions();
        // Show success notification
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Withdrawal Handlers
  // ============================================

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawAccount) return;
    
    setIsLoading(true);
    try {
      const response = await paymentApi.withdraw({
        amount: parseFloat(withdrawAmount),
        currency: 'USD',
        paymentMethod: withdrawMethod,
        accountDetails: { accountNumber: withdrawAccount },
      });
      
      if (response.data.success) {
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        setWithdrawAccount('');
        fetchBalance();
        fetchTransactions();
        // Show success notification
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Copy Address Handler
  // ============================================

  const handleCopyAddress = async () => {
    const success = await copyToClipboard('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    if (success) {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">My Wallet</h1>
        <p className="text-secondary-500 mt-1">
          Manage your funds and view transaction history
        </p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <Badge className="bg-white/20 text-white">Fiat</Badge>
            </div>
            <p className="text-primary-100 text-sm mb-1">Available Balance</p>
            <p className="text-3xl font-bold">{formatCurrency(balance.fiat)}</p>
            <div className="flex gap-2 mt-4">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 bg-white text-primary-600 hover:bg-primary-50"
                onClick={() => setShowDepositModal(true)}
                leftIcon={<ArrowDownLeft className="w-4 h-4" />}
              >
                Deposit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-white/30 text-white hover:bg-white/10"
                onClick={() => setShowWithdrawModal(true)}
                leftIcon={<ArrowUpRight className="w-4 h-4" />}
              >
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Bitcoin className="w-6 h-6 text-yellow-600" />
              </div>
              <Badge variant="warning">Crypto</Badge>
            </div>
            <p className="text-secondary-500 text-sm mb-1">USDT Balance</p>
            <p className="text-3xl font-bold text-secondary-900">
              {formatCrypto(balance.cryptoUsdt, 'USDT')}
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              ≈ {formatCurrency(balance.cryptoUsdt)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Bitcoin className="w-6 h-6 text-orange-600" />
              </div>
              <Badge variant="warning">Crypto</Badge>
            </div>
            <p className="text-secondary-500 text-sm mb-1">BTC Balance</p>
            <p className="text-3xl font-bold text-secondary-900">
              {formatCrypto(balance.cryptoBtc, 'BTC')}
            </p>
            <p className="text-sm text-secondary-500 mt-1">
              ≈ {formatCurrency(balance.cryptoBtc * 65000)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="Quick Actions" />
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setShowDepositModal(true)}
                  >
                    <ArrowDownLeft className="w-6 h-6" />
                    <span>Deposit Funds</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setShowWithdrawModal(true)}
                  >
                    <ArrowUpRight className="w-6 h-6" />
                    <span>Withdraw Funds</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Payment Methods" />
              <CardContent>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center`}>
                          <method.icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">{method.name}</p>
                          <p className="text-xs text-secondary-500">Fee: {method.fee}</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deposit Tab */}
        <TabsContent value="deposit">
          <Card>
            <CardHeader title="Select Deposit Method" />
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedMethod(method.id as PaymentMethod);
                      setShowDepositModal(true);
                    }}
                    className="p-4 border-2 border-secondary-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                  >
                    <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center mb-3`}>
                      <method.icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="font-medium text-secondary-900">{method.name}</p>
                    <p className="text-sm text-secondary-500">Fee: {method.fee}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw">
          <Card>
            <CardHeader title="Withdraw Funds" />
            <CardContent className="max-w-md">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Amount
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    leftIcon={<Wallet className="w-4 h-4" />}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Withdrawal Method
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value as PaymentMethod)}
                    className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Account Details
                  </label>
                  <Input
                    placeholder="Enter account number or address"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleWithdraw}
                  isLoading={isLoading}
                  disabled={!withdrawAmount || !withdrawAccount}
                >
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <TransactionList 
            transactions={transactions}
            showTypeFilter
          />
        </TabsContent>
      </Tabs>

      {/* Deposit Modal */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title="Deposit Funds"
        size="md"
      >
        <div className="space-y-4">
          {!selectedMethod ? (
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id as PaymentMethod)}
                  className="p-4 border-2 border-secondary-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-all"
                >
                  <div className={`w-10 h-10 ${method.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                    <method.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-center">{method.name}</p>
                </button>
              ))}
            </div>
          ) : selectedMethod === 'crypto' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Select Cryptocurrency
                </label>
                <select
                  value={selectedCrypto}
                  onChange={(e) => setSelectedCrypto(e.target.value)}
                  className="w-full px-4 py-2.5 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {CRYPTO_OPTIONS.map((crypto) => (
                    <option key={crypto.id} value={crypto.id}>
                      {crypto.name} - {crypto.network}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-4 bg-secondary-50 rounded-lg">
                <p className="text-sm text-secondary-600 mb-2">
                  Send {selectedCrypto} to this address:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white rounded border border-secondary-200 text-sm break-all">
                    0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAddress}
                    leftIcon={copiedAddress ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  >
                    {copiedAddress ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  Only send {selectedCrypto} on the {CRYPTO_OPTIONS.find(c => c.id === selectedCrypto)?.network} network. 
                  Sending other assets may result in permanent loss.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Amount
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  leftIcon={<Wallet className="w-4 h-4" />}
                />
              </div>
              {(selectedMethod === 'wave' || selectedMethod === 'orange_money') && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="+225 XX XXX XXXX"
                    value={depositPhone}
                    onChange={(e) => setDepositPhone(e.target.value)}
                    leftIcon={<Smartphone className="w-4 h-4" />}
                  />
                </div>
              )}
              <div className="p-3 bg-secondary-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary-500">Fee</span>
                  <span className="text-secondary-900">
                    {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.fee}
                  </span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleDeposit}
                isLoading={isLoading}
                disabled={!depositAmount || ((selectedMethod === 'wave' || selectedMethod === 'orange_money') && !depositPhone)}
              >
                Proceed to Payment
              </Button>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WalletPage;
