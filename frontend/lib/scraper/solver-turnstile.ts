import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { addExtra } from 'puppeteer-extra';

// Add stealth plugin to puppeteer-core (EXACT MATCH with test/solver-turnstile.js)
const pup = addExtra(puppeteer);
pup.use(StealthPlugin());

interface TurnstileResult {
  success: boolean;
  url: string;
  timing: {
    started: string;
    completed: string | null;
  };
  logs: string[];
  turnstile: {
    detected: boolean;
    iframeFound: boolean;
    responseTokenObtained: boolean;
    tokenValue: string | null;
  };
  response: {
    statusCode: number | null;
    body: any;
    headers: Record<string, string>;
  };
  error: string | null;
}

/**
 * Advanced Cloudflare Turnstile Solver for Netlify Functions
 * Uses @sparticuz/chromium-min for optimized serverless deployment
 */
export async function solveTurnstile(customUrl: string | null = null): Promise<TurnstileResult> {
  let browser;
  let page; // Make page accessible outside try block
  const defaultUrl = 'https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?&orderby=pnl_7d&direction=desc&limit=200';
  const result: TurnstileResult = {
    success: false,
    url: customUrl || defaultUrl,
    timing: {
      started: new Date().toISOString(),
      completed: null
    },
    logs: [],
    turnstile: {
      detected: false,
      iframeFound: false,
      responseTokenObtained: false,
      tokenValue: null
    },
    response: {
      statusCode: null,
      body: null,
      headers: {}
    },
    error: null
  };

  const log = (msg: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logMsg = `[${timestamp}] ${msg}`;
    console.log(logMsg);
    result.logs.push(logMsg);
  };

  try {
    log('🚀 Starting Puppeteer with Stealth (Netlify Serverless)...');
    
    // Use @sparticuz/chromium-min for optimized serverless (lighter than full chromium)
    browser = await pup.launch({
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-extensions'
      ]
    });

    page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.setViewport({ width: 1280, height: 800 });

    // Intercept requests to get the API data once we bypass the challenge
    let responseData: any = null;
    
    await page.on('response', async (response: any) => {
      const url = response.url();
      
      if (url.includes('gmgn.ai/defi/quotation/v1/rank/sol/wallets')) {
        const status = response.status();
        log(`🔔 Listener fired: status=${status}, url=${url.substring(0, 80)}...`);
        
        try {
          const buffer = await response.buffer();
          const text = buffer.toString('utf-8');
          
          try {
            responseData = JSON.parse(text);
            log(`✅ Intercepted API response: code=${responseData.code}`);
          } catch (e) {
            log(`⚠️  Response is not JSON (${text.length} chars, status=${status}): ${text.substring(0, 100)}`);
          }
        } catch (e: any) {
          log(`⚠️  Buffer error: ${e.message}`);
        }
      }
    });

    log(`📡 Navigating to: ${result.url}`);
    
    try {
      const response = await page.goto(result.url, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });
      
      if (response) {
        result.response.statusCode = response.status();
        result.response.headers = response.headers() as Record<string, string>;
        log(`📊 Status: ${response.status()}`);
      }
    } catch (e: any) {
      log(`⚠️  Navigation timed out or failed: ${e.message}`);
    }

    // Wait for initial page load
    log('⏳ Waiting for page to load...');
    await page.waitForTimeout(3000);

    // Now wait for the Turnstile iframe to appear
    log('👁️  Waiting for Turnstile iframe...');
    
    try {
      await page.waitForFunction(
        () => {
          const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]') as HTMLIFrameElement | null;
          return iframe && iframe.offsetHeight > 0;
        },
        { timeout: 15000 }
      );
      
      result.turnstile.iframeFound = true;
      log('✅ Turnstile iframe detected');
    } catch (e: any) {
      log(`⚠️  Iframe not found or not visible: ${e.message}`);
      
      // Try alternative detection
      const checkForTurnstile = await page.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]') as HTMLIFrameElement | null;
        const template = document.querySelector('template[shadowrootmode="closed"]');
        const input = document.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        
        return {
          iframeExists: !!iframe,
          iframeSrc: iframe?.src,
          templateExists: !!template,
          inputExists: !!input
        };
      });
      
      log(`🔍 Manual detection: ${JSON.stringify(checkForTurnstile)}`);
    }

    result.turnstile.detected = true;

    // Wait for the response token to be populated
    log('⏳ Waiting for response token...');
    
    try {
      await page.waitForFunction(
        () => {
          const token = document.querySelector('#cf-chl-widget-*_response') as HTMLInputElement | null;
          const tokenValue = token?.value;
          return tokenValue && tokenValue.length > 0;
        },
        { timeout: 30000 }
      );
      
      const tokenValue = await page.evaluate(() => {
        const token = document.querySelector('input[id$="_response"]') as HTMLInputElement | null;
        return token?.value || null;
      });
      
      if (tokenValue) {
        result.turnstile.responseTokenObtained = true;
        result.turnstile.tokenValue = tokenValue;
        log(`✅ Response token obtained: ${tokenValue.substring(0, 50)}...`);
      }
    } catch (e: any) {
      log(`⚠️  No response token within timeout: ${e.message}`);
    }

    // Wait for page to redirect or update after token is obtained
    if (result.turnstile.responseTokenObtained) {
      log('⏳ Waiting for redirect after token...');
      
      try {
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
        log('✅ Page navigated after challenge');
      } catch (e) {
        log('ℹ️  No navigation detected');
      }
      
      await page.waitForTimeout(2000);
    }

    // Try to get the API response
    if (responseData) {
      result.response.body = responseData;
      result.success = responseData.code === 0;
      log(`✅ API Response: code=${responseData.code}`);
      
      // CHECK COOKIES AFTER SUCCESS
      const cookies = await page.cookies();
      log(`🍪 Total cookies: ${cookies.length}`);
      const cfCookie = cookies.find((c: any) => c.name === 'cf_clearance');
      if (cfCookie) {
        log(`✅ cf_clearance found: ${cfCookie.value.substring(0, 30)}...`);
        log(`   Domain: ${cfCookie.domain}, Expires: ${new Date(cfCookie.expires * 1000).toISOString()}`);
      } else {
        log(`⚠️  No cf_clearance in cookies`);
        log(`   Available cookies: ${cookies.map((c: any) => c.name).join(', ')}`);
      }
    } else {
      // Try to extract from page
      log('📄 Attempting to extract data from page...');
      
      const pageData = await page.evaluate(() => {
        try {
          const preTag = document.querySelector('pre');
          if (preTag) {
            return JSON.parse(preTag.innerText);
          }
          
          const bodyText = document.body.innerText;
          if (bodyText && bodyText.includes('"code":')) {
            return JSON.parse(bodyText);
          }
        } catch (e) {
          // Ignore
        }
        return null;
      });

      if (pageData && pageData.code === 0) {
        result.response.body = pageData;
        result.success = true;
        log(`✅ Extracted API data from page`);
      } else {
        log(`⚠️  Could not extract API data`);
      }
    }

  } catch (error: any) {
    result.error = error.message;
    log(`❌ Fatal error: ${error.message}`);
  }

  // Close browser
  if (browser) {
    try {
      await browser.close();
    } catch (e: any) {
      log(`⚠️  Error closing browser: ${e.message}`);
    }
  }

  result.timing.completed = new Date().toISOString();
  const duration = (new Date(result.timing.completed).getTime() - new Date(result.timing.started).getTime()) / 1000;

  // Output summary
  console.log('\n' + '═'.repeat(80));
  console.log('SUMMARY');
  console.log('═'.repeat(80));
  
  console.log(`Success: ${result.success}`);
  console.log(`Duration: ${duration}s`);
  console.log(`Turnstile Detected: ${result.turnstile.detected}`);
  console.log(`Iframe Found: ${result.turnstile.iframeFound}`);
  console.log(`Response Token: ${result.turnstile.responseTokenObtained}`);
  console.log(`API Status: ${result.response.statusCode}`);
  
  if (result.response.body && result.response.body.code === 0) {
    console.log(`✅ API Response Code: ${result.response.body.code} - ${result.response.body.msg}`);
    if (result.response.body.data && result.response.body.data.rank) {
      console.log(`✅ Got ${result.response.body.data.rank.length} wallet entries`);
    }
  }

  console.log('═'.repeat(80));

  if (result.response.body) {
    console.log('\n📊 RESPONSE PREVIEW:');
    console.log(JSON.stringify(result.response.body, null, 2).substring(0, 1000));
  }

  return result;
}
