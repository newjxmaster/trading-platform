/**
 * Cryptocurrency Service - Trading Platform
 * Integration with Web3.js for crypto deposits (USDT, USDC, BTC, ETH)
 */

import Web3 from 'web3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';
import {
  CryptoDepositRequest,
  CryptoDepositResponse,
  CryptoTransactionEvent,
  TransactionStatus,
  CryptoCurrency,
  PaymentMethod,
  TransactionType,
  CRYPTO_NETWORKS,
  CRYPTO_DECIMALS,
} from '../types/payment.types';
import { CryptoError, InvalidAddressError, PaymentProcessingError } from '../utils/errors';
import logger from '../utils/logger';
import * as walletService from './walletService';

// Web3 Configuration
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_KEY';
const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const CRYPTO_DEPOSIT_ADDRESS = process.env.CRYPTO_DEPOSIT_ADDRESS || '';
const CRYPTO_WEBHOOK_SECRET = process.env.CRYPTO_WEBHOOK_SECRET || '';

// Bitcoin configuration (using a third-party API like BlockCypher or Blockchain.info)
const BTC_API_URL = process.env.BTC_API_URL || 'https://api.blockcypher.com/v1/btc/main';
const BTC_API_TOKEN = process.env.BTC_API_TOKEN || '';

// Web3 instance
let web3: Web3 | null = null;

// Active deposit monitors
const activeMonitors = new Map<string, NodeJS.Timeout>();

// ERC-20 Token ABI (simplified for transfers)
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
];

// Token contract addresses (Mainnet)
const TOKEN_CONTRACTS: Record<CryptoCurrency, string> = {
  [CryptoCurrency.USDT]: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  [CryptoCurrency.USDC]: '0xA0b86a33E6441E6C7D3D4B4f6c7A8B9C0D1E2F3A', // Example address
  [CryptoCurrency.BTC]: '', // BTC doesn't use contract addresses
  [CryptoCurrency.ETH]: '', // Native ETH doesn't use contract addresses
};

/**
 * Initialize Web3 client
 */
export function initializeWeb3(): Web3 {
  if (!web3) {
    const rpcUrl = INFURA_API_KEY
      ? `${ETHEREUM_RPC_URL}/${INFURA_API_KEY}`
      : ETHEREUM_RPC_URL;

    web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
  }

  return web3;
}

/**
 * Generate a unique reference for crypto transactions
 */
function generateReference(): string {
  return `CRYPTO_${Date.now()}_${uuidv4().slice(0, 8)}`;
}

/**
 * Generate a unique deposit address for a user
 * In production, you'd use HD wallets or a deposit address per user
 */
export async function generateDepositAddress(
  request: CryptoDepositRequest
): Promise<CryptoDepositResponse> {
  const { amount, currency, userId } = request;

  // Validate inputs
  if (!amount || amount <= 0) {
    throw new CryptoError('Invalid amount');
  }

  if (!Object.values(CryptoCurrency).includes(currency)) {
    throw new CryptoError(`Unsupported cryptocurrency: ${currency}`);
  }

  try {
    const reference = generateReference();

    // Record pending transaction
    const pendingTx = await walletService.recordTransaction(
      userId,
      TransactionType.DEPOSIT,
      PaymentMethod.CRYPTO,
      amount,
      currency,
      TransactionStatus.PENDING,
      reference,
      {
        expectedAmount: amount,
        currency,
      }
    );

    // Generate or retrieve deposit address
    let depositAddress: string;
    let memo: string | undefined;

    if (currency === CryptoCurrency.BTC) {
      // For BTC, you might use a different address per transaction
      depositAddress = await generateBitcoinAddress(reference);
    } else {
      // For ETH and ERC-20 tokens, use the main deposit address
      // In production, generate unique addresses using HD wallet
      depositAddress = CRYPTO_DEPOSIT_ADDRESS || generateEthereumAddress(userId, reference);
      
      // For some tokens, a memo/tag might be needed
      if (currency === CryptoCurrency.USDT || currency === CryptoCurrency.USDC) {
        memo = `TX-${pendingTx.id.slice(0, 8)}`;
      }
    }

    // Generate QR code
    const qrCodeData = memo
      ? `${currency}:${depositAddress}?amount=${amount}&memo=${memo}`
      : `${currency}:${depositAddress}?amount=${amount}`;

    const qrCode = await QRCode.toDataURL(qrCodeData);

    // Set expiration (24 hours)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Start monitoring for deposits
    startDepositMonitor(pendingTx.id, depositAddress, currency, amount, userId);

    logger.logPayment('Crypto', 'address_generated', pendingTx.id, {
      currency,
      amount,
      address: depositAddress,
    });

    return {
      transactionId: pendingTx.id,
      depositAddress,
      qrCode,
      network: CRYPTO_NETWORKS[currency],
      currency,
      amount,
      expiresAt,
      memo,
    };
  } catch (error) {
    logger.error('Crypto deposit address generation failed', error as Error, 'CryptoService', {
      userId,
      amount,
      currency,
    });

    throw new CryptoError(`Failed to generate deposit address: ${(error as Error).message}`);
  }
}

/**
 * Generate a Bitcoin address (using external service or HD wallet)
 */
async function generateBitcoinAddress(reference: string): Promise<string> {
  // In production, use an HD wallet or service like BitGo, BlockCypher, etc.
  // For now, return a placeholder or derive from reference
  if (process.env.NODE_ENV === 'development') {
    return `bc1q${crypto.createHash('sha256').update(reference).digest('hex').slice(0, 38)}`;
  }

  // Use BlockCypher or similar service to generate address
  // const response = await axios.post(`${BTC_API_URL}/addrs?token=${BTC_API_TOKEN}`);
  // return response.data.address;

  return process.env.BTC_DEPOSIT_ADDRESS || '';
}

/**
 * Generate an Ethereum address (using HD wallet derivation)
 */
function generateEthereumAddress(userId: string, reference: string): string {
  // In production, use HD wallet derivation
  // For now, return the main deposit address or derive deterministically
  if (CRYPTO_DEPOSIT_ADDRESS) {
    return CRYPTO_DEPOSIT_ADDRESS;
  }

  // Generate a deterministic address from userId and reference
  const seed = crypto.createHash('sha256').update(`${userId}:${reference}`).digest('hex');
  const web3 = initializeWeb3();
  const account = web3.eth.accounts.create(seed);
  return account.address;
}

/**
 * Validate a cryptocurrency address
 */
export function validateAddress(address: string, currency: CryptoCurrency): boolean {
  try {
    if (currency === CryptoCurrency.BTC) {
      // Basic Bitcoin address validation
      const btcRegex = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
      return btcRegex.test(address);
    } else {
      // Ethereum address validation
      const web3 = initializeWeb3();
      return web3.utils.isAddress(address);
    }
  } catch (error) {
    return false;
  }
}

/**
 * Start monitoring for deposits
 */
export function startDepositMonitor(
  transactionId: string,
  address: string,
  currency: CryptoCurrency,
  expectedAmount: number,
  userId: string
): void {
  // Clear any existing monitor for this transaction
  stopDepositMonitor(transactionId);

  const monitorInterval = currency === CryptoCurrency.BTC ? 60000 : 15000; // 1 min for BTC, 15 sec for ETH
  let checkCount = 0;
  const maxChecks = 5760; // 24 hours for BTC, 6 hours for ETH

  const intervalId = setInterval(async () => {
    checkCount++;

    try {
      const result = await checkForDeposit(address, currency, expectedAmount);

      if (result.found) {
        // Deposit found, process it
        await processDeposit(transactionId, result.txHash!, result.amount, currency, userId);
        stopDepositMonitor(transactionId);
        return;
      }

      // Check if expired
      if (checkCount >= maxChecks) {
        logger.info('Deposit monitor expired', 'CryptoService', {
          transactionId,
          address,
          currency,
        });
        await walletService.updateTransactionStatus(
          transactionId,
          TransactionStatus.CANCELLED,
          { reason: 'Deposit window expired' }
        );
        stopDepositMonitor(transactionId);
      }
    } catch (error) {
      logger.error('Deposit monitor error', error as Error, 'CryptoService', {
        transactionId,
        address,
      });
    }
  }, monitorInterval);

  activeMonitors.set(transactionId, intervalId);

  logger.info('Deposit monitor started', 'CryptoService', {
    transactionId,
    address,
    currency,
    interval: monitorInterval,
  });
}

/**
 * Stop monitoring for deposits
 */
export function stopDepositMonitor(transactionId: string): void {
  const intervalId = activeMonitors.get(transactionId);
  if (intervalId) {
    clearInterval(intervalId);
    activeMonitors.delete(transactionId);
    logger.info('Deposit monitor stopped', 'CryptoService', { transactionId });
  }
}

/**
 * Check for deposits at an address
 */
async function checkForDeposit(
  address: string,
  currency: CryptoCurrency,
  expectedAmount: number
): Promise<{ found: boolean; txHash?: string; amount?: number }> {
  try {
    if (currency === CryptoCurrency.BTC) {
      return await checkBitcoinDeposit(address, expectedAmount);
    } else {
      return await checkEthereumDeposit(address, currency, expectedAmount);
    }
  } catch (error) {
    logger.error('Error checking for deposit', error as Error, 'CryptoService', {
      address,
      currency,
    });
    return { found: false };
  }
}

/**
 * Check for Bitcoin deposits
 */
async function checkBitcoinDeposit(
  address: string,
  expectedAmount: number
): Promise<{ found: boolean; txHash?: string; amount?: number }> {
  try {
    // Use BlockCypher API or similar
    const url = `${BTC_API_URL}/addrs/${address}?token=${BTC_API_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.txrefs && data.txrefs.length > 0) {
      // Check recent transactions
      for (const tx of data.txrefs.slice(0, 5)) {
        const txAmount = tx.value / 100000000; // Convert satoshis to BTC
        const tolerance = expectedAmount * 0.01; // 1% tolerance

        if (Math.abs(txAmount - expectedAmount) <= tolerance && tx.confirmations >= 3) {
          return {
            found: true,
            txHash: tx.tx_hash,
            amount: txAmount,
          };
        }
      }
    }

    return { found: false };
  } catch (error) {
    logger.error('BTC deposit check failed', error as Error, 'CryptoService', { address });
    return { found: false };
  }
}

/**
 * Check for Ethereum/ERC-20 deposits
 */
async function checkEthereumDeposit(
  address: string,
  currency: CryptoCurrency,
  expectedAmount: number
): Promise<{ found: boolean; txHash?: string; amount?: number }> {
  try {
    const web3 = initializeWeb3();

    if (currency === CryptoCurrency.ETH) {
      // Check for native ETH transfers
      const balance = await web3.eth.getBalance(address);
      const ethBalance = parseFloat(web3.utils.fromWei(balance, 'ether'));

      // In production, you'd track the starting balance and compare
      // For now, just check if balance meets expected amount
      if (ethBalance >= expectedAmount * 0.95) { // 5% tolerance
        // Get the transaction that deposited this
        const blockNumber = await web3.eth.getBlockNumber();
        const blocks = await web3.eth.getBlock(blockNumber, true);

        for (const tx of blocks.transactions || []) {
          if (tx.to?.toLowerCase() === address.toLowerCase()) {
            const txValue = parseFloat(web3.utils.fromWei(tx.value, 'ether'));
            if (txValue >= expectedAmount * 0.95) {
              // Check confirmations
              const receipt = await web3.eth.getTransactionReceipt(tx.hash);
              if (receipt && receipt.blockNumber) {
                const confirmations = blockNumber - receipt.blockNumber;
                if (confirmations >= 3) {
                  return {
                    found: true,
                    txHash: tx.hash,
                    amount: txValue,
                  };
                }
              }
            }
          }
        }
      }
    } else {
      // Check for ERC-20 token transfers
      const contractAddress = TOKEN_CONTRACTS[currency];
      if (!contractAddress) {
        return { found: false };
      }

      const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);
      const balance = await contract.methods.balanceOf(address).call();
      const decimals = CRYPTO_DECIMALS[currency];
      const tokenBalance = parseFloat(balance) / Math.pow(10, decimals);

      if (tokenBalance >= expectedAmount * 0.95) {
        // Get Transfer events
        const blockNumber = await web3.eth.getBlockNumber();
        const events = await contract.getPastEvents('Transfer', {
          filter: { to: address },
          fromBlock: blockNumber - 100,
          toBlock: 'latest',
        });

        for (const event of events.slice(-5)) {
          const returnValues = event.returnValues as any;
          const value = parseFloat(returnValues.value) / Math.pow(10, decimals);

          if (value >= expectedAmount * 0.95) {
            // Check confirmations
            const receipt = await web3.eth.getTransactionReceipt(event.transactionHash);
            if (receipt && receipt.blockNumber) {
              const confirmations = blockNumber - receipt.blockNumber;
              if (confirmations >= 3) {
                return {
                  found: true,
                  txHash: event.transactionHash,
                  amount: value,
                };
              }
            }
          }
        }
      }
    }

    return { found: false };
  } catch (error) {
    logger.error('ETH deposit check failed', error as Error, 'CryptoService', { address, currency });
    return { found: false };
  }
}

/**
 * Process a confirmed deposit
 */
async function processDeposit(
  transactionId: string,
  txHash: string,
  amount: number,
  currency: CryptoCurrency,
  userId: string
): Promise<void> {
  try {
    const transaction = await walletService.getTransactionById(transactionId);

    if (!transaction) {
      logger.error('Transaction not found for deposit', 'CryptoService', { transactionId });
      return;
    }

    // Idempotency check
    if (transaction.status === TransactionStatus.COMPLETED) {
      logger.info('Deposit already processed', 'CryptoService', { transactionId });
      return;
    }

    // Update transaction
    await walletService.updateTransactionStatus(
      transactionId,
      TransactionStatus.COMPLETED,
      {
        txHash,
        confirmedAmount: amount,
        confirmations: 3,
        processedAt: new Date().toISOString(),
      }
    );

    // Credit wallet (no fees for crypto deposits, only network fees paid by sender)
    await walletService.creditWallet({
      userId,
      amount,
      currency,
      transactionType: TransactionType.DEPOSIT,
      referenceId: `${transactionId}_credit`,
      metadata: {
        txHash,
        paymentMethod: PaymentMethod.CRYPTO,
        currency,
        networkFee: 'paid_by_sender',
      },
    });

    logger.logPayment('Crypto', 'deposit_confirmed', transactionId, {
      currency,
      amount,
      txHash,
    });
  } catch (error) {
    logger.error('Error processing deposit', error as Error, 'CryptoService', {
      transactionId,
      txHash,
    });
  }
}

/**
 * Verify a blockchain transaction
 */
export async function verifyTransaction(
  txHash: string,
  currency: CryptoCurrency
): Promise<{
  verified: boolean;
  confirmations: number;
  amount?: number;
  from?: string;
  to?: string;
  status: TransactionStatus;
}> {
  try {
    if (currency === CryptoCurrency.BTC) {
      return await verifyBitcoinTransaction(txHash);
    } else {
      return await verifyEthereumTransaction(txHash, currency);
    }
  } catch (error) {
    logger.error('Transaction verification failed', error as Error, 'CryptoService', {
      txHash,
      currency,
    });

    return {
      verified: false,
      confirmations: 0,
      status: TransactionStatus.FAILED,
    };
  }
}

/**
 * Verify Bitcoin transaction
 */
async function verifyBitcoinTransaction(
  txHash: string
): Promise<{
  verified: boolean;
  confirmations: number;
  amount?: number;
  from?: string;
  to?: string;
  status: TransactionStatus;
}> {
  try {
    const url = `${BTC_API_URL}/txs/${txHash}?token=${BTC_API_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();

    const confirmations = data.confirmations || 0;
    const verified = confirmations >= 3;

    // Extract amount from outputs
    let amount = 0;
    let to = '';
    if (data.outputs && data.outputs.length > 0) {
      amount = data.outputs[0].value / 100000000;
      to = data.outputs[0].addresses?.[0] || '';
    }

    return {
      verified,
      confirmations,
      amount,
      from: data.inputs?.[0]?.addresses?.[0],
      to,
      status: verified ? TransactionStatus.COMPLETED : TransactionStatus.PROCESSING,
    };
  } catch (error) {
    return {
      verified: false,
      confirmations: 0,
      status: TransactionStatus.FAILED,
    };
  }
}

/**
 * Verify Ethereum transaction
 */
async function verifyEthereumTransaction(
  txHash: string,
  currency: CryptoCurrency
): Promise<{
  verified: boolean;
  confirmations: number;
  amount?: number;
  from?: string;
  to?: string;
  status: TransactionStatus;
}> {
  try {
    const web3 = initializeWeb3();

    const receipt = await web3.eth.getTransactionReceipt(txHash);
    const tx = await web3.eth.getTransaction(txHash);

    if (!receipt || !tx) {
      return {
        verified: false,
        confirmations: 0,
        status: TransactionStatus.PENDING,
      };
    }

    const currentBlock = await web3.eth.getBlockNumber();
    const confirmations = receipt.blockNumber ? currentBlock - receipt.blockNumber : 0;
    const verified = confirmations >= 3 && receipt.status;

    let amount = 0;
    if (currency === CryptoCurrency.ETH) {
      amount = parseFloat(web3.utils.fromWei(tx.value, 'ether'));
    } else {
      // For ERC-20 tokens, parse from logs
      // This is simplified - in production, properly decode the Transfer event
      amount = 0; // Would need to decode from event logs
    }

    return {
      verified,
      confirmations,
      amount,
      from: tx.from,
      to: tx.to || '',
      status: verified ? TransactionStatus.COMPLETED : TransactionStatus.PROCESSING,
    };
  } catch (error) {
    return {
      verified: false,
      confirmations: 0,
      status: TransactionStatus.FAILED,
    };
  }
}

/**
 * Handle crypto webhook (from blockchain monitoring service)
 */
export async function handleWebhook(
  payload: CryptoTransactionEvent,
  signature: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verify signature
    if (!verifyWebhookSignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    logger.logWebhook('Crypto', 'transaction_detected', {
      txHash: payload.txHash,
      currency: payload.currency,
      amount: payload.amount,
    });

    // Find transaction by deposit address
    // In production, you'd have a mapping of addresses to transactions
    const { txHash, to, amount, currency, confirmations } = payload;

    if (confirmations < 3) {
      return { success: true, message: 'Waiting for more confirmations' };
    }

    // Process the deposit
    // This would look up the pending transaction by address
    // and call processDeposit()

    return { success: true, message: 'Webhook processed' };
  } catch (error) {
    logger.error('Crypto webhook processing failed', error as Error, 'CryptoService', {
      payload,
    });

    throw error;
  }
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: CryptoTransactionEvent,
  signature: string
): boolean {
  if (!CRYPTO_WEBHOOK_SECRET) {
    logger.warn('Crypto webhook secret not configured', 'CryptoService');
    return true; // Allow in development
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', CRYPTO_WEBHOOK_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get crypto balance for an address
 */
export async function getAddressBalance(
  address: string,
  currency: CryptoCurrency
): Promise<number> {
  try {
    if (currency === CryptoCurrency.BTC) {
      const url = `${BTC_API_URL}/addrs/${address}/balance?token=${BTC_API_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      return data.balance / 100000000; // Convert satoshis to BTC
    } else {
      const web3 = initializeWeb3();

      if (currency === CryptoCurrency.ETH) {
        const balance = await web3.eth.getBalance(address);
        return parseFloat(web3.utils.fromWei(balance, 'ether'));
      } else {
        const contractAddress = TOKEN_CONTRACTS[currency];
        if (!contractAddress) return 0;

        const contract = new web3.eth.Contract(ERC20_ABI, contractAddress);
        const balance = await contract.methods.balanceOf(address).call();
        return parseFloat(balance) / Math.pow(10, CRYPTO_DECIMALS[currency]);
      }
    }
  } catch (error) {
    logger.error('Failed to get address balance', error as Error, 'CryptoService', {
      address,
      currency,
    });
    return 0;
  }
}

/**
 * Get estimated network fees
 */
export async function getNetworkFees(
  currency: CryptoCurrency
): Promise<{ slow: number; average: number; fast: number }> {
  try {
    if (currency === CryptoCurrency.BTC) {
      // Get BTC fees from mempool or API
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      const data = await response.json();
      return {
        slow: data.hourFee,
        average: data.halfHourFee,
        fast: data.fastestFee,
      };
    } else {
      // Get ETH gas prices
      const web3 = initializeWeb3();
      const gasPrice = await web3.eth.getGasPrice();
      const gweiPrice = parseFloat(web3.utils.fromWei(gasPrice, 'gwei'));

      return {
        slow: gweiPrice * 0.8,
        average: gweiPrice,
        fast: gweiPrice * 1.5,
      };
    }
  } catch (error) {
    logger.error('Failed to get network fees', error as Error, 'CryptoService', { currency });
    return { slow: 0, average: 0, fast: 0 };
  }
}

/**
 * Cleanup all monitors (call on shutdown)
 */
export function cleanupMonitors(): void {
  activeMonitors.forEach((intervalId, transactionId) => {
    clearInterval(intervalId);
    logger.info('Monitor cleaned up', 'CryptoService', { transactionId });
  });
  activeMonitors.clear();
}

export default {
  generateDepositAddress,
  verifyTransaction,
  monitorDeposits: startDepositMonitor,
  stopDepositMonitor,
  handleWebhook,
  validateAddress,
  getAddressBalance,
  getNetworkFees,
  initializeWeb3,
  cleanupMonitors,
};
