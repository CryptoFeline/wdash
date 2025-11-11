/**
 * Browserless.io Integration
 * 
 * Uses Browserless /unblock REST API to bypass Cloudflare with:
 * - Managed browser pool (no local Chromium)
 * - Residential proxy rotation (95%+ success rate)
 * - Built-in stealth and CAPTCHA solving
 * - 3-5 second responses vs 60-90s with local puppeteer
 * 
 * Docs: https://docs.browserless.io/rest-apis/unblock
 */

const BROWSERLESS_ENDPOINT = 'https://production-sfo.browserless.io/unblock';

/**
 * Get API token (read dynamically to support dotenv loading)
 * Supports backup tokens in format: BROWSERLESS_API_TOKEN, BROWSERLESS_API_TOKEN_2, etc.
 */
function getApiToken() {
  // Collect all available tokens
  const tokens = [];
  
  // Primary token
  if (process.env.BROWSERLESS_API_TOKEN) {
    tokens.push(process.env.BROWSERLESS_API_TOKEN);
  }
  
  // Backup tokens (BROWSERLESS_API_TOKEN_2, BROWSERLESS_API_TOKEN_3, etc.)
  for (let i = 2; i <= 10; i++) {
    const backupToken = process.env[`BROWSERLESS_API_TOKEN_${i}`];
    if (backupToken) {
      tokens.push(backupToken);
    }
  }
  
  if (tokens.length === 0) {
    console.warn('[Browserless] WARNING: No BROWSERLESS_API_TOKEN found. API calls will fail.');
    return null;
  }
  
  // Rotate through tokens to distribute load
  // Use timestamp-based rotation to spread requests across all available tokens
  const tokenIndex = Math.floor(Date.now() / 1000) % tokens.length;
  const selectedToken = tokens[tokenIndex];
  
  if (tokens.length > 1) {
    console.log(`[Browserless] Using token ${tokenIndex + 1}/${tokens.length} (rotating load across ${tokens.length} API keys)`);
  }
  
  return selectedToken;
}


/**
 * Fetch URL using Browserless /unblock API
 * 
 * @param {string} url - Target URL to fetch
 * @param {Object} options - Fetch options
 * @param {boolean} options.useProxy - Use residential proxy (default: true, costs 6 units/MB)
 * @param {number} options.waitForTimeout - Wait time for page load in ms (default: 8000)
 * @param {string} options.waitUntil - Navigation wait condition (default: 'networkidle2')
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @returns {Promise<Object>} Result object with success, content, error
 */
export async function fetchWithBrowserless(url, options = {}) {
  const {
    useProxy = true,
    waitForTimeout = 8000,
    waitUntil = 'networkidle2',
    maxRetries = 3
  } = options;

  const log = (msg) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[Browserless][${timestamp}] ${msg}`);
  };

  // Get API token dynamically
  const apiToken = getApiToken();
  if (!apiToken) {
    return {
      success: false,
      content: null,
      cookies: [],
      duration: 0,
      error: 'BROWSERLESS_API_TOKEN not set in environment variables'
    };
  }

  // Build Browserless URL with token and optional proxy
  const browserlessUrl = useProxy 
    ? `${BROWSERLESS_ENDPOINT}?token=${apiToken}&proxy=residential`
    : `${BROWSERLESS_ENDPOINT}?token=${apiToken}`;


  // Request body for /unblock API
  const requestBody = {
    url: url,
    content: true,              // Return HTML/JSON content
    cookies: false,             // Don't need cookies for JSON APIs
    screenshot: false,          // Don't need screenshot
    browserWSEndpoint: false,   // Don't need WebSocket (simple content mode)
    ttl: 0,                     // Don't keep browser alive (one-shot request)
    waitForTimeout: waitForTimeout,
    gotoOptions: {
      waitUntil: waitUntil,     // Wait for networkidle2 before returning
      timeout: 60000            // Max 60s for navigation
    }
  };

  log(`Fetching: ${url}`);
  log(`Proxy: ${useProxy ? 'residential' : 'datacenter'}`);
  log(`Wait: ${waitForTimeout}ms (${waitUntil})`);

  // Retry logic
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      
      log(`Attempt ${attempt}/${maxRetries}...`);

      const response = await fetch(browserlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(90000) // 90s total timeout
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Validate response has content
      if (!data.content) {
        throw new Error('Empty content in Browserless response');
      }

      log(`✅ Success in ${duration}s (${data.content.length} bytes)`);

      return {
        success: true,
        content: data.content,
        cookies: data.cookies || [],
        duration: parseFloat(duration),
        error: null
      };

    } catch (error) {
      const duration = ((Date.now() - Date.now()) / 1000).toFixed(2);
      
      log(`❌ Attempt ${attempt} failed: ${error.message}`);

      // Last attempt - return error
      if (attempt === maxRetries) {
        log(`Failed after ${maxRetries} attempts`);
        
        // Check if it's a rate limit error
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
          return {
            success: false,
            content: null,
            cookies: [],
            duration: 0,
            error: 'Browserless rate limit exceeded. Free tier allows 1 concurrent browser. Try again in 30 seconds.'
          };
        }
        
        return {
          success: false,
          content: null,
          cookies: [],
          duration: 0,
          error: error.message
        };
      }

      // Exponential backoff: 2s, 4s, 8s
      // For 429 errors, use longer delay (30s)
      const is429 = error.message.includes('429') || error.message.includes('Too Many Requests');
      const backoffDelay = is429 ? 30000 : Math.pow(2, attempt) * 1000;
      
      log(`Retrying in ${backoffDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
}

/**
 * Convenience wrapper to fetch and parse JSON from Browserless
 * 
 * @param {string} url - API URL that returns JSON
 * @param {Object} options - Same as fetchWithBrowserless
 * @returns {Promise<Object>} Parsed JSON data
 * @throws {Error} If fetch fails or JSON parsing fails
 */
export async function fetchJSONWithBrowserless(url, options = {}) {
  const result = await fetchWithBrowserless(url, options);

  if (!result.success) {
    throw new Error(result.error || 'Browserless fetch failed');
  }

  try {
    let content = result.content;
    
    // Check if response is HTML-wrapped JSON (browser renders JSON as HTML)
    // Look for <pre> tag which browsers use to display JSON
    if (content.startsWith('<html>') || content.startsWith('<!DOCTYPE')) {
      const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch && preMatch[1]) {
        content = preMatch[1].trim();
      } else {
        // Try to extract anything that looks like JSON between HTML tags
        const jsonMatch = content.match(/>\s*(\{[\s\S]*\})\s*</);
        if (jsonMatch && jsonMatch[1]) {
          content = jsonMatch[1].trim();
        }
      }
    }
    
    const jsonData = JSON.parse(content);
    return jsonData;
  } catch (parseError) {
    console.error('[Browserless] JSON parse error:', parseError);
    console.error('[Browserless] Content preview:', result.content.substring(0, 500));
    throw new Error(`Failed to parse JSON response: ${parseError.message}`);
  }
}

/**
 * Get Browserless account stats (unit usage, remaining quota, etc.)
 * Useful for monitoring free tier limits
 * 
 * @returns {Promise<Object>} Account statistics
 */
export async function getBrowserlessStats() {
  const apiToken = getApiToken();
  if (!apiToken) {
    return { error: 'No API token configured' };
  }

  try {
    // Note: Browserless doesn't have a public stats API endpoint
    // This is a placeholder for future monitoring integration
    // For now, users should check the Browserless dashboard manually
    return {
      message: 'Check Browserless dashboard for usage stats',
      dashboard: 'https://account.browserless.io/',
      freeTier: {
        units: '1,000 units/month',
        concurrent: '1 browser',
        proxy: '6 units/MB for residential'
      }
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Test Browserless connection and configuration
 * 
 * @returns {Promise<Object>} Test result with success status
 */
export async function testBrowserlessConnection() {
  const testUrl = 'https://example.com';
  const apiToken = getApiToken();
  
  console.log('[Browserless] Testing connection...');
  console.log('[Browserless] API Token:', apiToken ? '✓ Set' : '✗ Missing');
  console.log('[Browserless] Test URL:', testUrl);

  const result = await fetchWithBrowserless(testUrl, {
    useProxy: false, // Use datacenter IP for test (faster, cheaper)
    waitForTimeout: 3000,
    maxRetries: 1
  });

  if (result.success) {
    console.log('[Browserless] ✅ Connection test passed');
    console.log('[Browserless] Response length:', result.content.length, 'bytes');
    console.log('[Browserless] Duration:', result.duration, 'seconds');
  } else {
    console.log('[Browserless] ❌ Connection test failed');
    console.log('[Browserless] Error:', result.error);
  }

  return result;
}

// Export default for backward compatibility
export default {
  fetchWithBrowserless,
  fetchJSONWithBrowserless,
  getBrowserlessStats,
  testBrowserlessConnection
};
