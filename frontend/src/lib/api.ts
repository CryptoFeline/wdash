// Client-side API calls go through Next.js API routes (server-side proxy)
// This keeps the backend API key secure and hidden from the browser
// 
// Security layers:
// 1. Same-origin policy: Browser can only call same-domain Next.js routes
// 2. Next.js server-side: API_KEY stored server-side, never exposed to browser
// 3. Backend CORS: Only accepts requests from FRONTEND_URL domain
// 4. Backend API key: Validates X-API-Key header from Next.js

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
