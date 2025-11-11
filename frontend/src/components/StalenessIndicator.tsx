import { Clock, RefreshCcw, Database } from 'lucide-react';

interface StalenessIndicatorProps {
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  totalWallets: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function StalenessIndicator({ 
  oldestTimestamp, 
  newestTimestamp, 
  totalWallets,
  onRefresh, 
  isRefreshing 
}: StalenessIndicatorProps) {
  if (!newestTimestamp) {
    // No data in database
    return (
      <div className="flex items-center justify-between px-4 py-2 border rounded-lg bg-gray-50 border-gray-200 text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span className="text-sm font-medium">
            No wallet data - Click refresh to fetch
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-md hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Fetching...' : 'Fetch Data'}
        </button>
      </div>
    );
  }

  const newestAge = Date.now() - newestTimestamp;
  const oldestAge = oldestTimestamp ? Date.now() - oldestTimestamp : newestAge;
  
  const formatAge = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
  };

  // Determine color based on newest data age (most recently fetched)
  let colorClass = 'text-green-600 bg-green-50 border-green-200';
  let statusText = 'Fresh data';
  
  if (newestAge > 10 * 60 * 1000) {
    // > 10 minutes: red (very stale)
    colorClass = 'text-red-600 bg-red-50 border-red-200';
    statusText = 'Stale data';
  } else if (newestAge > 5 * 60 * 1000) {
    // 5-10 minutes: yellow (getting stale)
    colorClass = 'text-yellow-600 bg-yellow-50 border-yellow-200';
    statusText = 'Data may be outdated';
  }

  const newestTimeText = formatAge(newestAge);
  const oldestTimeText = oldestTimestamp ? formatAge(oldestAge) : newestTimeText;

  return (
    <div className={`flex items-col gap-2 px-4 py-3 border rounded-lg ${colorClass} mb-4`}>
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {statusText} {/* - {totalWallets.toLocaleString()} wallets */}
            </span>
            <span className="text-xs opacity-75">
              Latest: {newestTimeText}
              {oldestTimestamp && oldestTimestamp !== newestTimestamp && (
                <> • Oldest: {oldestTimeText}</>
              )}
            </span>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

