
'use server';

/**
 * Sovereign Universal Fetch Engine v6.0 - Human Spoofing Edition
 * Optimized with advanced Chrome 124 headers to bypass Bot Detection, CORS, and Rate Limits.
 */

const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Referer": "https://www.google.com/",
  "Origin": "https://www.google.com"
};

export async function sovereignFetch(url: string, options: any = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...BROWSER_HEADERS,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Sovereign Bypass Failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (error: any) {
    console.error(`[Sovereign Bypass Error] URL: ${url}`, error.message);
    return null;
  }
}
