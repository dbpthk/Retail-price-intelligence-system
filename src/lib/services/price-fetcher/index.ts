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

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PriceTracker/1.0; +https://example.com)",
      },
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
