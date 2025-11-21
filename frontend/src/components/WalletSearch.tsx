'use client';

import { useState } from 'react';
import { Search, Loader2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
/* import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'; */
import AdvancedAnalyticsModal from './AdvancedAnalyticsModal';

interface ChainInfo {
  chainId: number;
  chainName: string;
  chainLogo: string;
  chainBWLogoUrl: string;
}

export default function WalletSearch() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Analytics Modal State
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setChains([]);
    setShowDropdown(false);

    try {
      const response = await fetch(`/api/wallets/${query.trim()}/chains`);
      const json = await response.json();

      if (json.code === 0 && json.data && json.data.length > 0) {
        const foundChains = json.data;
        
        if (foundChains.length === 1) {
          // Only 1 chain found - open modal immediately
          openAnalytics(query.trim(), foundChains[0].chainId.toString());
        } else {
          // Multiple chains - show dropdown
          setChains(foundChains);
          setShowDropdown(true);
        }
      } else {
        // No chains found or error
        alert('No chains found for this wallet address.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openAnalytics = (address: string, chainId: string) => {
    setSelectedWallet(address);
    setSelectedChain(chainId);
    setIsModalOpen(true);
    setShowDropdown(false);
    setChains([]);
  };

  return (
    <div className="relative w-full max-w-md">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search wallet address..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-12"
        />
        {loading && (
          <div className="absolute right-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </form>

      {/* Chain Selection Dropdown (Custom implementation to appear below input) */}
      {showDropdown && chains.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border rounded-md shadow-md p-1 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 sticky top-0 bg-popover z-10">
            Select Chain
          </div>
          {chains.map((chain) => (
            <button
              key={chain.chainId}
              onClick={() => openAnalytics(query.trim(), chain.chainId.toString())}
              className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
            >
              <img 
                src={chain.chainLogo} 
                alt={chain.chainName} 
                className="w-5 h-5 rounded-full"
              />
              <span>{chain.chainName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Analytics Modal */}
      {selectedWallet && selectedChain && (
        <AdvancedAnalyticsModal
          wallet={selectedWallet}
          chain={selectedChain}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
