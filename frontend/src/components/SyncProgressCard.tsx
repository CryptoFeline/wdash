import React from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SyncEngineStatus } from '@/hooks/useSyncEngine';

interface SyncProgressCardProps {
  engineStatus: SyncEngineStatus;
  onSync?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onClearErrors?: () => void;
  isSyncing?: boolean;
}

export function SyncProgressCard({
  engineStatus,
  onSync,
  onPause,
  onResume,
  onClearErrors,
  isSyncing = false,
}: SyncProgressCardProps) {
  const statusColor = {
    idle: 'text-gray-500',
    running: 'text-blue-500',
    paused: 'text-yellow-500',
    error: 'text-red-500',
  }[engineStatus.status];

  const statusLabel = {
    idle: 'Idle',
    running: 'Running',
    paused: 'Paused',
    error: 'Error',
  }[engineStatus.status];

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);

    if (secs < 60) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatNextSync = (timestamp: number | null) => {
    if (!timestamp) return 'Unknown';
    const now = Date.now();
    const diff = timestamp - now;
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);

    if (secs < 0) return 'Soon';
    if (secs < 60) return `${secs}s`;
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
  };

  return (
    <div className="border rounded-lg p-6 space-y-4 bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            Sync Status
            <Badge variant="outline" className={statusColor}>
              {statusLabel}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground">
            Rolling sync engine for tracked wallets
          </p>
        </div>
        <div className="flex gap-2">
          {engineStatus.status === 'running' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPause}
              className="gap-2"
            >
              Pause
            </Button>
          )}
          {engineStatus.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
              className="gap-2"
            >
              Resume
            </Button>
          )}
          {!isSyncing && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSync}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Now
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>
            Progress: {engineStatus.progress.completed} of {engineStatus.progress.total}
          </span>
          <span className="font-semibold">{engineStatus.progress.percentage}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              engineStatus.status === 'error'
                ? 'bg-red-500'
                : engineStatus.status === 'paused'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${engineStatus.progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Last Sync</p>
          <p className="font-semibold">{formatTime(engineStatus.lastSyncTime)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Next Sync</p>
          <p className="font-semibold">{formatNextSync(engineStatus.nextSyncTime)}</p>
        </div>
        {engineStatus.currentWallet && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Currently Syncing</p>
            <p className="font-mono text-xs truncate">{engineStatus.currentWallet}</p>
          </div>
        )}
      </div>

      {/* Errors */}
      {engineStatus.errors.length > 0 && (
        <div className="space-y-2 p-3 bg-red-50 dark:bg-red-950 rounded border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">
              Sync Errors ({engineStatus.errors.length})
            </h4>
            {onClearErrors && (
              <button
                onClick={onClearErrors}
                className="ml-auto text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
            {engineStatus.errors.slice(-3).map((err, idx) => (
              <li key={idx} className="truncate">
                {err.wallet.substring(0, 8)}... {err.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Message */}
      {engineStatus.status === 'idle' && (
        <div className="text-xs text-muted-foreground p-2 bg-gray-50 dark:bg-gray-900 rounded">
          Sync engine is idle. Start syncing to begin collecting wallet data.
        </div>
      )}
      {engineStatus.status === 'paused' && (
        <div className="text-xs text-yellow-700 dark:text-yellow-200 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
          Sync engine is paused. Resume to continue collecting wallet data.
        </div>
      )}
      {engineStatus.status === 'running' && (
        <div className="text-xs text-blue-700 dark:text-blue-200 p-2 bg-blue-50 dark:bg-blue-950 rounded">
          Sync engine is running. Wallets are being synced on a rolling 5-minute schedule.
        </div>
      )}
    </div>
  );
}
