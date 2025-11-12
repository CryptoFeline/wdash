import { useEffect } from 'react';

/**
 * Keep-alive hook: pings backend periodically to prevent cold start
 * Render's free tier spins down the service after 15 minutes of inactivity
 * This keeps it awake
 */
export function useBackendKeepAlive() {
  useEffect(() => {
    // Ping backend every 10 minutes
    const interval = setInterval(async () => {
      try {
        const response = await fetch('https://dashboard-backend-mo1j.onrender.com/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          console.log('[KeepAlive] Backend pinged successfully');
        }
      } catch (error) {
        console.error('[KeepAlive] Failed to ping backend:', error);
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(interval);
  }, []);
}
