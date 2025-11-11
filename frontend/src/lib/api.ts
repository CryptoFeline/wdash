// Client-side API calls now go through Next.js API routes (server-side)
// This keeps the backend API key secure and hidden from the browser
// Frontend routes are protected by middleware in production

// Get frontend API key from public env var (only used in production)
const FRONTEND_API_KEY = process.env.NEXT_PUBLIC_FRONTEND_API_KEY;

// Helper to add auth header in production
function getHeaders(): HeadersInit {
  if (process.env.NODE_ENV === 'production' && FRONTEND_API_KEY) {
    return {
      'x-api-key': FRONTEND_API_KEY,
    };
  }
  return {};
}

export async function fetchWallets(params: {
  chain?: string;
  timeframe?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  const { chain = 'eth', timeframe = '7d', tag = 'all', page = 1, limit = 50 } = params;
  const url = `/api/wallets?chain=${chain}&timeframe=${timeframe}&tag=${tag}&page=${page}&limit=${limit}`;
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  
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
  const response = await fetch(url, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  
  return response.json();
}

export async function fetchChains() {
  const response = await fetch(`/api/chains`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch chains');
  }
  
  return response.json();
}

export async function fetchTags() {
  const response = await fetch(`/api/tags`, {
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch tags');
  }
  
  return response.json();
}
