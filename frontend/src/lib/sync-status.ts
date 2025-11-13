'use client';

/**
 * Sync Status Storage
 * Manages persistence of sync state, errors, and history
 */

export interface EndpointStatus {
  status: 'idle' | 'in-progress' | 'success' | 'error';
  time?: number; // milliseconds taken
  error?: string;
  lastAttempt?: number; // timestamp
}

export interface WalletSyncStatus {
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  status: 'idle' | 'in-progress' | 'synced' | 'error';
  endpoints: {
    endpoint1?: EndpointStatus;
    endpoint4a?: EndpointStatus;
    endpoint4b?: EndpointStatus;
    endpoint6?: EndpointStatus;
  };
  error: string | null;
  tokensUpdated: number;
  dataSize: string; // "158KB"
  retryCount: number;
  lastError: string | null;
  lastErrorTime: number | null;
}

export interface SyncError {
  wallet: string;
  error: string;
  timestamp: number;
  endpoint?: string;
  retryable: boolean;
}

export interface SyncQueueItem {
  address: string;
  scheduledFor: number;
  priority: 'high' | 'normal';
  retryCount: number;
}

export interface GlobalSyncStatus {
  lastGlobalSync: number | null;
  isSyncing: boolean;
  currentWallet: string | null;
  startTime: number | null;
  wallets: Record<string, WalletSyncStatus>;
  queue: SyncQueueItem[];
  errors: SyncError[];
  paused: boolean;
}

const STORAGE_KEY = 'gmgn_sync_status';

/**
 * Initialize default sync status
 */
function getDefaultStatus(): GlobalSyncStatus {
  return {
    lastGlobalSync: null,
    isSyncing: false,
    currentWallet: null,
    startTime: null,
    wallets: {},
    queue: [],
    errors: [],
    paused: false,
  };
}

/**
 * Get current sync status from localStorage
 */
export function getSyncStatus(): GlobalSyncStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as GlobalSyncStatus;
    }
  } catch (error) {
    console.error('[SyncStatus] Failed to load from localStorage:', error);
  }
  return getDefaultStatus();
}

/**
 * Save sync status to localStorage
 */
export function saveSyncStatus(status: GlobalSyncStatus) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  } catch (error) {
    console.error('[SyncStatus] Failed to save to localStorage:', error);
  }
}

/**
 * Update a wallet's sync status
 */
export function updateWalletSyncStatus(address: string, updates: Partial<WalletSyncStatus>) {
  const status = getSyncStatus();
  const current = status.wallets[address.toLowerCase()] || {
    lastSyncTime: null,
    nextSyncTime: null,
    status: 'idle',
    endpoints: {},
    error: null,
    tokensUpdated: 0,
    dataSize: '0KB',
    retryCount: 0,
    lastError: null,
    lastErrorTime: null,
  };
  
  status.wallets[address.toLowerCase()] = { ...current, ...updates };
  saveSyncStatus(status);
}

/**
 * Add error to sync error log
 */
export function recordSyncError(wallet: string, error: string, endpoint?: string, retryable = true) {
  const status = getSyncStatus();
  
  const syncError: SyncError = {
    wallet: wallet.toLowerCase(),
    error,
    timestamp: Date.now(),
    endpoint,
    retryable,
  };
  
  status.errors.push(syncError);
  
  // Keep only last 50 errors
  if (status.errors.length > 50) {
    status.errors = status.errors.slice(-50);
  }
  
  saveSyncStatus(status);
  console.log('[SyncStatus] Recorded error:', syncError);
}

/**
 * Clear sync errors
 */
export function clearSyncErrors() {
  const status = getSyncStatus();
  status.errors = [];
  saveSyncStatus(status);
}

/**
 * Update endpoint status for a wallet
 */
export function updateEndpointStatus(
  wallet: string,
  endpoint: 'endpoint1' | 'endpoint4a' | 'endpoint4b' | 'endpoint6',
  statusUpdate: EndpointStatus
) {
  const walletAddress = wallet.toLowerCase();
  const status = getSyncStatus();
  
  if (!status.wallets[walletAddress]) {
    status.wallets[walletAddress] = {
      lastSyncTime: null,
      nextSyncTime: null,
      status: 'idle',
      endpoints: {},
      error: null,
      tokensUpdated: 0,
      dataSize: '0KB',
      retryCount: 0,
      lastError: null,
      lastErrorTime: null,
    };
  }
  
  status.wallets[walletAddress].endpoints[endpoint] = statusUpdate;
  saveSyncStatus(status);
}

/**
 * Add wallet to sync queue
 */
export function addToSyncQueue(
  address: string,
  scheduledFor: number,
  priority: 'high' | 'normal' = 'normal'
) {
  const status = getSyncStatus();
  const queueItem: SyncQueueItem = {
    address: address.toLowerCase(),
    scheduledFor,
    priority,
    retryCount: 0,
  };
  
  // Check if already in queue
  const existingIndex = status.queue.findIndex(
    (q) => q.address === queueItem.address
  );
  
  if (existingIndex >= 0) {
    // Replace existing item
    status.queue[existingIndex] = queueItem;
  } else {
    status.queue.push(queueItem);
  }
  
  // Sort by scheduled time and priority
  status.queue.sort((a, b) => {
    if (a.scheduledFor !== b.scheduledFor) {
      return a.scheduledFor - b.scheduledFor;
    }
    const priorityMap = { high: 0, normal: 1 };
    return priorityMap[a.priority] - priorityMap[b.priority];
  });
  
  saveSyncStatus(status);
}

/**
 * Remove wallet from sync queue
 */
export function removeFromSyncQueue(address: string) {
  const status = getSyncStatus();
  status.queue = status.queue.filter((q) => q.address !== address.toLowerCase());
  saveSyncStatus(status);
}

/**
 * Get next wallet to sync from queue
 */
export function getNextWalletInQueue(): SyncQueueItem | null {
  const status = getSyncStatus();
  const now = Date.now();
  
  // Find first item that's ready to sync
  for (const item of status.queue) {
    if (item.scheduledFor <= now) {
      return item;
    }
  }
  
  return null;
}

/**
 * Mark sync as started
 */
export function markSyncStarted(wallet: string) {
  const status = getSyncStatus();
  status.isSyncing = true;
  status.currentWallet = wallet.toLowerCase();
  status.startTime = Date.now();
  saveSyncStatus(status);
}

/**
 * Mark sync as completed
 */
export function markSyncCompleted(wallet: string, tokensUpdated: number, dataSize: string) {
  const status = getSyncStatus();
  status.isSyncing = false;
  status.currentWallet = null;
  status.startTime = null;
  status.lastGlobalSync = Date.now();
  
  updateWalletSyncStatus(wallet, {
    lastSyncTime: Date.now(),
    status: 'synced',
    tokensUpdated,
    dataSize,
    retryCount: 0,
    error: null,
  });
  
  saveSyncStatus(status);
}

/**
 * Mark sync as failed
 */
export function markSyncFailed(wallet: string, error: string) {
  const status = getSyncStatus();
  status.isSyncing = false;
  status.currentWallet = null;
  status.startTime = null;
  
  const walletAddr = wallet.toLowerCase();
  const walletStatus = status.wallets[walletAddr] || {
    lastSyncTime: null,
    nextSyncTime: null,
    status: 'idle',
    endpoints: {},
    error: null,
    tokensUpdated: 0,
    dataSize: '0KB',
    retryCount: 0,
    lastError: null,
    lastErrorTime: null,
  };
  
  walletStatus.status = 'error';
  walletStatus.error = error;
  walletStatus.lastError = error;
  walletStatus.lastErrorTime = Date.now();
  walletStatus.retryCount = (walletStatus.retryCount || 0) + 1;
  
  status.wallets[walletAddr] = walletStatus;
  saveSyncStatus(status);
}

/**
 * Get sync progress (completed / total)
 */
export function getSyncProgress(): { completed: number; total: number; percentage: number } {
  const status = getSyncStatus();
  const total = Object.keys(status.wallets).length;
  const completed = Object.values(status.wallets).filter(
    (w) => w.status === 'synced'
  ).length;
  
  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/**
 * Pause syncing
 */
export function pauseSyncing() {
  const status = getSyncStatus();
  status.paused = true;
  saveSyncStatus(status);
}

/**
 * Resume syncing
 */
export function resumeSyncing() {
  const status = getSyncStatus();
  status.paused = false;
  saveSyncStatus(status);
}

/**
 * Clear all sync status (fresh start)
 */
export function clearAllSyncStatus() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get recent errors (last N)
 */
export function getRecentErrors(limit: number = 10): SyncError[] {
  const status = getSyncStatus();
  return status.errors.slice(-limit).reverse();
}

/**
 * Get wallet sync duration in seconds
 */
export function getWalletSyncDuration(wallet: string): number | null {
  const walletStatus = getSyncStatus().wallets[wallet.toLowerCase()];
  if (!walletStatus || !walletStatus.lastSyncTime) {
    return null;
  }
  
  const endpoints = walletStatus.endpoints;
  const times = Object.values(endpoints)
    .filter((e) => e.time)
    .map((e) => e.time || 0);
  
  return times.length > 0 ? times.reduce((a, b) => a + b, 0) / 1000 : null;
}
