import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { PriceUpdatePayload, OrderMatchedPayload, NewTradePayload, DividendDistributedPayload } from '../types';

// ============================================
// Socket Configuration
// ============================================

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// ============================================
// useSocket Hook
// ============================================

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // ============================================
  // Initialize Socket Connection
  // ============================================

  useEffect(() => {
    // Get auth token from localStorage
    const tokens = localStorage.getItem('auth_tokens');
    const accessToken = tokens ? JSON.parse(tokens).accessToken : null;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setConnectionError('Reconnection failed');
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ============================================
  // Event Subscription Methods
  // ============================================

  const subscribeToPriceUpdates = useCallback((callback: (data: PriceUpdatePayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('price_update', callback);

    return () => {
      socket.off('price_update', callback);
    };
  }, []);

  const subscribeToOrderMatches = useCallback((callback: (data: OrderMatchedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('order_matched', callback);

    return () => {
      socket.off('order_matched', callback);
    };
  }, []);

  const subscribeToNewTrades = useCallback((callback: (data: NewTradePayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('new_trade', callback);

    return () => {
      socket.off('new_trade', callback);
    };
  }, []);

  const subscribeToDividends = useCallback((callback: (data: DividendDistributedPayload) => void) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.on('dividend_distributed', callback);

    return () => {
      socket.off('dividend_distributed', callback);
    };
  }, []);

  // ============================================
  // Room Subscription Methods
  // ============================================

  const joinCompanyRoom = useCallback((companyId: string) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    socket.emit('join_company', { companyId });
    console.log('Joined company room:', companyId);
  }, [isConnected]);

  const leaveCompanyRoom = useCallback((companyId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('leave_company', { companyId });
    console.log('Left company room:', companyId);
  }, []);

  const joinUserRoom = useCallback((userId: string) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    socket.emit('join_user', { userId });
    console.log('Joined user room:', userId);
  }, [isConnected]);

  const leaveUserRoom = useCallback((userId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit('leave_user', { userId });
    console.log('Left user room:', userId);
  }, []);

  // ============================================
  // Emit Methods
  // ============================================

  const emit = useCallback(<T = unknown>(event: string, data: T) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) {
      console.warn('Socket not connected, cannot emit:', event);
      return;
    }

    socket.emit(event, data);
  }, [isConnected]);

  // ============================================
  // Reconnect Method
  // ============================================

  const reconnect = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      socket.connect();
    }
  }, []);

  return {
    // State
    socket: socketRef.current,
    isConnected,
    connectionError,

    // Event subscriptions
    subscribeToPriceUpdates,
    subscribeToOrderMatches,
    subscribeToNewTrades,
    subscribeToDividends,

    // Room management
    joinCompanyRoom,
    leaveCompanyRoom,
    joinUserRoom,
    leaveUserRoom,

    // Emit
    emit,

    // Reconnect
    reconnect,
  };
};

export default useSocket;
