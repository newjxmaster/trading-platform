import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Info, 
  AlertCircle,
  CheckCircle2,
  ShoppingCart
} from 'lucide-react';
import { Modal } from '@components/ui/Modal';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Badge } from '@components/ui/Badge';
import { LoadingSpinner } from '@components/feedback/LoadingSpinner';
import { useTradingStore } from '@stores/tradingStore';
import { useWalletStore } from '@stores/walletStore';
import { tradingApi } from '@services/api';
import { Company, OrderType, OrderSide, PlaceOrderData } from '@types/index';
import { formatCurrency, formatNumber } from '@utils/formatters';

// ============================================
// Order Modal Component
// ============================================

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  side: OrderSide;
  onSuccess?: () => void;
}

const PLATFORM_FEE_PERCENT = 0.5; // 0.5%

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  company,
  side,
  onSuccess,
}) => {
  const { balance } = useWalletStore();
  const { fetchPortfolio } = useTradingStore();
  
  // ============================================
  // State
  // ============================================
  
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [quantity, setQuantity] = useState('');
  const [limitPrice, setLimitPrice] = useState(company.currentPrice.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderDetails, setOrderDetails] = useState<{
    quantity: number;
    price: number;
    total: number;
    fee: number;
    grandTotal: number;
  } | null>(null);

  // ============================================
  // Calculate Order Details
  // ============================================

  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const price = orderType === 'market' 
      ? company.currentPrice 
      : parseFloat(limitPrice) || 0;
    
    const total = qty * price;
    const fee = total * (PLATFORM_FEE_PERCENT / 100);
    const grandTotal = total + fee;

    setOrderDetails({
      quantity: qty,
      price,
      total,
      fee,
      grandTotal,
    });
  }, [quantity, limitPrice, orderType, company.currentPrice]);

  // ============================================
  // Validation
  // ============================================

  const validateOrder = (): string | null => {
    const qty = parseFloat(quantity);
    
    if (!qty || qty <= 0) {
      return 'Please enter a valid quantity';
    }
    
    if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
      return 'Please enter a valid limit price';
    }
    
    if (side === 'buy') {
      if (orderDetails && orderDetails.grandTotal > balance.fiat) {
        return `Insufficient balance. You need ${formatCurrency(orderDetails.grandTotal)}`;
      }
    } else {
      // Check if user has enough shares to sell
      // This would need to be fetched from portfolio
    }
    
    if (qty > company.availableShares && side === 'buy') {
      return `Only ${formatNumber(company.availableShares)} shares available`;
    }
    
    return null;
  };

  // ============================================
  // Submit Order
  // ============================================

  const handleSubmit = async () => {
    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const orderData: PlaceOrderData = {
        companyId: company.id,
        orderType,
        side,
        quantity: parseFloat(quantity),
        price: orderType === 'limit' ? parseFloat(limitPrice) : undefined,
      };

      const response = await tradingApi.placeOrder(orderData);

      if (response.data.success) {
        setShowSuccess(true);
        fetchPortfolio();
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError(response.data.message || 'Failed to place order');
      }
    } catch (err) {
      setError('An error occurred while placing your order. Please try again.');
      console.error('Order error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // Reset on Close
  // ============================================

  useEffect(() => {
    if (!isOpen) {
      setQuantity('');
      setLimitPrice(company.currentPrice.toString());
      setOrderType('market');
      setError(null);
      setShowSuccess(false);
    }
  }, [isOpen, company.currentPrice]);

  // ============================================
  // Render Success State
  // ============================================

  if (showSuccess) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Order Placed" size="sm">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success-600" />
          </div>
          <h3 className="text-xl font-semibold text-secondary-900 mb-2">
            Order Successful!
          </h3>
          <p className="text-secondary-500 mb-4">
            Your {side} order for {quantity} shares of {company.businessName} has been placed.
          </p>
          <div className="p-4 bg-secondary-50 rounded-lg text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-secondary-500">Shares</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-secondary-500">Price</span>
              <span className="font-medium">{formatCurrency(orderDetails?.price || 0)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-secondary-500">Total</span>
              <span className="font-medium">{formatCurrency(orderDetails?.total || 0)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-secondary-200">
              <span className="text-secondary-500">Order Type</span>
              <span className="font-medium capitalize">{orderType}</span>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ============================================
  // Render Order Form
  // ============================================

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${side === 'buy' ? 'Buy' : 'Sell'} Shares - ${company.businessName}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Current Price Display */}
        <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
          <div>
            <p className="text-sm text-secondary-500">Current Price</p>
            <p className="text-2xl font-bold text-secondary-900">
              {formatCurrency(company.currentPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-secondary-500">Available Shares</p>
            <p className="text-lg font-medium text-secondary-900">
              {formatNumber(company.availableShares)}
            </p>
          </div>
        </div>

        {/* Order Type Selection */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setOrderType('market')}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                orderType === 'market'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              <p className="font-medium text-secondary-900">Market Order</p>
              <p className="text-xs text-secondary-500 mt-1">
                Buy at current market price
              </p>
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                orderType === 'limit'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-secondary-200 hover:border-secondary-300'
              }`}
            >
              <p className="font-medium text-secondary-900">Limit Order</p>
              <p className="text-xs text-secondary-500 mt-1">
                Set your own price
              </p>
            </button>
          </div>
        </div>

        {/* Limit Price Input */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Limit Price
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter price"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
            />
            <p className="text-xs text-secondary-500 mt-1">
              Your order will execute when the market price reaches this level
            </p>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-1">
            Number of Shares
          </label>
          <Input
            type="number"
            placeholder="Enter quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            leftIcon={<ShoppingCart className="w-4 h-4" />}
          />
          <div className="flex gap-2 mt-2">
            {[10, 50, 100, 500].map((amount) => (
              <button
                key={amount}
                onClick={() => setQuantity(amount.toString())}
                className="px-3 py-1 text-xs bg-secondary-100 hover:bg-secondary-200 rounded-full transition-colors"
              >
                {amount}
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        {orderDetails && orderDetails.quantity > 0 && (
          <div className="p-4 bg-secondary-50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Shares</span>
              <span className="font-medium">{formatNumber(orderDetails.quantity)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Price per Share</span>
              <span className="font-medium">{formatCurrency(orderDetails.price)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(orderDetails.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-secondary-500">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="font-medium">{formatCurrency(orderDetails.fee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-secondary-200">
              <span className="font-medium text-secondary-900">Total</span>
              <span className="font-bold text-secondary-900">
                {formatCurrency(orderDetails.grandTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Wallet Balance */}
        {side === 'buy' && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-700">Available Balance</span>
            <span className="font-medium text-blue-900">{formatCurrency(balance.fiat)}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-danger-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-danger-500 flex-shrink-0" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          className="w-full"
          size="lg"
          variant={side === 'buy' ? 'primary' : 'danger'}
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!quantity || parseFloat(quantity) <= 0}
          leftIcon={side === 'buy' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        >
          {side === 'buy' ? 'Buy Shares' : 'Sell Shares'}
        </Button>

        <p className="text-xs text-secondary-500 text-center">
          By placing this order, you agree to our Terms of Service and Trading Rules
        </p>
      </div>
    </Modal>
  );
};

export default OrderModal;
