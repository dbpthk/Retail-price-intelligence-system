import "server-only";
import * as cheerio from "cheerio";

const DEFAULT_TIMEOUT_MS = 10_000;

export type PriceFetcherConfig = {
  selector: string;
  timeoutMs?: number;
};

export class PriceFetcherError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "FETCH_FAILED"
      | "TIMEOUT"
      | "INVALID_HTML"
      | "SELECTOR_NOT_FOUND"
      | "NO_PRICE_FOUND"
  ) {
    super(message);
    this.name = "PriceFetcherError";
  }
}

/**
 * Extracts a numeric price from a string (e.g. "$10.99", "€10,99", "1,234.56").
 * Returns null if no valid number is found.
 */
function parsePriceFromText(text: string): number | null {
  const cleaned = text
    .replace(/[^\d.,\s]/g, "")
    .trim()
    .replace(/\s+/g, "");

  if (!cleaned) return null;

  const hasCommaDecimal = /^\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned);
  const hasDotDecimal = /^\d{1,3}(,\d{3})*(\.\d+)?$/.test(cleaned);

  let normalized: string;
  if (hasCommaDecimal) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasDotDecimal) {
    normalized = cleaned.replace(/,/g, "");
  } else {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  }

  const num = parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

/**
 * Fetches HTML from a URL with timeout support.
 */
async function fetchHtml(
  url: string,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const browserHeaders = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: browserHeaders,
    });

    if (!response.ok) {
      throw new PriceFetcherError(
        `Fetch failed: ${response.status} ${response.statusText}`,
        "FETCH_FAILED"
      );
    }

    const html = await response.text();
    return html;
  } catch (error) {
    if (error instanceof PriceFetcherError) throw error;
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new PriceFetcherError(
          `Request timed out after ${timeoutMs}ms`,
          "TIMEOUT"
        );
      }
      throw new PriceFetcherError(
        `Fetch failed: ${error.message}`,
        "FETCH_FAILED"
      );
    }
    throw new PriceFetcherError("Fetch failed: unknown error", "FETCH_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches a product page and extracts the price using a configurable CSS selector.
 * Server-side only. Do not import in client components.
 *
 * @param url - Product page URL
 * @param config - Selector and optional timeout
 * @returns Extracted price as number
 * @throws PriceFetcherError on fetch failure, timeout, invalid HTML, or when price cannot be extracted
 */
export async function fetchPrice(
  url: string,
  config: PriceFetcherConfig
): Promise<number> {
  const { selector, timeoutMs = DEFAULT_TIMEOUT_MS } = config;

  if (!selector?.trim()) {
    throw new PriceFetcherError("Selector is required", "SELECTOR_NOT_FOUND");
  }

  const html = await fetchHtml(url, timeoutMs);

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    throw new PriceFetcherError("Invalid or malformed HTML", "INVALID_HTML");
  }

  const elements = $(selector);
  if (elements.length === 0) {
    throw new PriceFetcherError(
      `No elements found for selector: ${selector}`,
      "SELECTOR_NOT_FOUND"
    );
  }

  for (let i = 0; i < elements.length; i++) {
    const text = $(elements[i]).text().trim();
    const price = parsePriceFromText(text);
    if (price !== null && price > 0) {
      return price;
    }
  }

  throw new PriceFetcherError(
    "Could not extract a valid price from the selected elements",
    "NO_PRICE_FOUND"
  );
}

const PLACEHOLDER_TITLE = "Product";

const TITLE_SELECTORS = [
  'meta[property="og:title"]',
  'meta[name="twitter:title"]',
  ".product-title",
  ".product-name",
  ".productTitle",
  "[data-product-name]",
  "h1.product-title",
  "h1.product-name",
  ".product__title",
  ".product-detail__title",
  "#productTitle",
  "#product-name",
  "h1",
  "title",
];

function cleanTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < 2) return "";
  const cleaned = trimmed
    .replace(/\s*[-|·|–|—]\s*.*$/, "")
    .replace(/\s*\|.*$/, "")
    .replace(/\s*-\s*Amazon\.com.*$/i, "")
    .replace(/\s*-\s*Walmart\.com.*$/i, "")
    .replace(/\s*-\s*eBay.*$/i, "")
    .replace(/\s*-\s*Target\.com.*$/i, "")
    .replace(/\s*-\s*Best Buy.*$/i, "")
    .replace(/\s*-\s*Shop.*$/i, "")
    .trim();
  return cleaned.length >= 2 ? cleaned : trimmed;
}

/**
 * Extracts product title from HTML using multiple strategies.
 */
function extractTitle($: cheerio.CheerioAPI): string {
  for (const sel of TITLE_SELECTORS) {
    if (sel.startsWith("meta")) {
      const content = $(sel).attr("content")?.trim();
      if (content) {
        const cleaned = cleanTitle(content);
        if (cleaned) return cleaned;
      }
    } else if (sel === "title") {
      const text = $("title").first().text().trim();
      if (text) {
        const cleaned = cleanTitle(text);
        if (cleaned) return cleaned;
      }
    } else {
      const text = $(sel).first().text().trim();
      if (text) {
        const cleaned = cleanTitle(text);
        if (cleaned && cleaned.length < 200) return cleaned;
      }
    }
  }
  return PLACEHOLDER_TITLE;
}

/**
 * Derives a readable name from URL path as last resort (e.g. /product-name-123 -> Product Name).
 */
function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\/+|\/+$/g, "");
    const segments = path.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return PLACEHOLDER_TITLE;
    const decoded = decodeURIComponent(last)
      .replace(/[-_]/g, " ")
      .replace(/\d{5,}/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (decoded.length >= 3) return decoded;
  } catch {
    // ignore
  }
  return PLACEHOLDER_TITLE;
}

export type FetchProductInfoResult = {
  price: number | null;
  title: string;
};

/**
 * Fetches a product page and extracts both price and title in a single request.
 * Use this when adding products to get the actual product name.
 */
export async function fetchProductInfo(
  url: string,
  config: PriceFetcherConfig
): Promise<FetchProductInfoResult> {
  const { selector, timeoutMs = DEFAULT_TIMEOUT_MS } = config;

  const html = await fetchHtml(url, timeoutMs);

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return { price: null, title: PLACEHOLDER_TITLE };
  }

  const title = extractTitle($);

  if (!selector?.trim()) {
    return { price: null, title };
  }

  const elements = $(selector);
  for (let i = 0; i < elements.length; i++) {
    const text = $(elements[i]).text().trim();
    const price = parsePriceFromText(text);
    if (price !== null && price > 0) {
      return { price, title };
    }
  }

  return { price: null, title };
}

const DEFAULT_PRICE_SELECTOR =
  ".price, .product-price, [data-price], #price, span[class*='price']";

/**
 * Fetches HTML and extracts title only (no price lookup). More reliable for title-only use.
 */
async function fetchTitleFromHtml(url: string): Promise<string> {
  const html = await fetchHtml(url, 10_000);
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return titleFromUrl(url);
  }
  const title = extractTitle($);
  return title !== PLACEHOLDER_TITLE ? title : titleFromUrl(url);
}

/**
 * Fetches a product page and extracts the title.
 * Tries HTML extraction first; falls back to URL-derived name on failure.
 */
export async function fetchTitle(url: string): Promise<string> {
  try {
    const title = await fetchTitleFromHtml(url);
    if (title && title !== PLACEHOLDER_TITLE) return title;
  } catch {
    // Fetch failed - try URL fallback
  }
  return titleFromUrl(url);
}
