// Client-side API calls now go through Next.js API routes (server-side)
// This keeps the API key secure and hidden from the browser

export async function fetchWallets(params: {
  chain?: string;
  timeframe?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  const { chain = 'eth', timeframe = '7d', tag = 'all', page = 1, limit = 50 } = params;
  const url = `/api/wallets?chain=${chain}&timeframe=${timeframe}&tag=${tag}&page=${page}&limit=${limit}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch wallets');
  }
  
  return response.json();
}

export async function fetchStats(params: {
  chain?: string;
  timeframe?: string;
  tag?: string;
}) {
  const { chain = 'eth', timeframe = '7d', tag = 'all' } = params;
  
  const url = `/api/wallets/stats?chain=${chain}&timeframe=${timeframe}&tag=${tag}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  
  return response.json();
}

export async function fetchChains() {
  const response = await fetch(`/api/chains`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch chains');
  }
  
  return response.json();
}

export async function fetchTags() {
  const response = await fetch(`/api/tags`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  
  return response.json();
}
