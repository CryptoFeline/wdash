'use client';

import { useState } from 'react';
import { Search, Loader2, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
/* import {
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
  const [addingToDb, setAddingToDb] = useState(false);
  const [addedToDb, setAddedToDb] = useState(false);
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
    setAddedToDb(false);

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

  const handleAddToDatabase = async () => {
    if (!query.trim()) return;
    
    setAddingToDb(true);
    try {
      // Determine chain from selected chain or default to sol
      const chain = selectedChain === '501' ? 'sol' : selectedChain === '1' ? 'eth' : 'sol';
      
      const response = await fetch('/api/wallets/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: query.trim(),
          chain: chain
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setAddedToDb(true);
        console.log('[WalletSearch] Added wallet to database:', result);
        // Reset after 3 seconds
        setTimeout(() => setAddedToDb(false), 3000);
      } else {
        alert(result.error || 'Failed to add wallet');
      }
    } catch (error) {
      console.error('Add to database failed:', error);
      alert('Failed to add wallet to database');
    } finally {
      setAddingToDb(false);
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
      <form onSubmit={handleSearch} className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search wallet address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-4"
          />
        </div>
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {/* Add to Database Button */}
        {query.trim().length >= 32 && (
          <Button
            type="button"
            variant={addedToDb ? "default" : "outline"}
            size="icon"
            onClick={handleAddToDatabase}
            disabled={addingToDb}
            title={addedToDb ? "Added to database" : "Add wallet to database"}
            className={addedToDb ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {addingToDb ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : addedToDb ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        )}
      </form>

      {/* Chain Selection Dropdown (Custom implementation to appear below input) */}
      {showDropdown && chains.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border rounded-md shadow-md p-1 animate-in fade-in zoom-in-95 max-h-60 overflow-y-auto">
          <div className="text-xs font-medium text-muted-foreground px-2 py-1.5 sticky top-0 bg-popover z-10">
            Select Chain
          </div>
          {chains.map((chain) => (
            <div key={chain.chainId} className="flex items-center gap-1">
              <button
                onClick={() => openAnalytics(query.trim(), chain.chainId.toString())}
                className="flex-1 flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <img 
                  src={chain.chainLogo} 
                  alt={chain.chainName} 
                  className="w-5 h-5 rounded-full"
                />
                <span>{chain.chainName}</span>
              </button>
              {/* Add to DB button per chain */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={async (e) => {
                  e.stopPropagation();
                  setAddingToDb(true);
                  try {
                    const chainSlug = chain.chainId === 501 ? 'sol' : chain.chainId === 1 ? 'eth' : chain.chainId === 56 ? 'bsc' : 'sol';
                    const response = await fetch('/api/wallets/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        address: query.trim(),
                        chain: chainSlug
                      })
                    });
                    const result = await response.json();
                    if (result.success) {
                      setAddedToDb(true);
                      setTimeout(() => setAddedToDb(false), 3000);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setAddingToDb(false);
                  }
                }}
                title="Add to database"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
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
