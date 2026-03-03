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
 * Fetches a product page and extracts the price using multiple strategies:
 * 1. Woolworths API (for woolworths.com.au / woolworths.co.za)
 * 2. JSON-LD schema.org Product data
 * 3. Multiple HTML selectors (sale price first, then generic)
 *
 * @param url - Product page URL
 * @param config - Selector (used as first to try) and optional timeout
 * @returns Extracted price and price type (sale/full)
 * @throws PriceFetcherError on fetch failure or when no price found
 */
export async function fetchPrice(
  url: string,
  config: PriceFetcherConfig
): Promise<PriceResult> {
  const { selector, timeoutMs = DEFAULT_TIMEOUT_MS } = config;

  const woolworthsResult = await fetchWoolworthsPrice(url);
  if (woolworthsResult !== null) return woolworthsResult;

  const html = await fetchHtml(url, timeoutMs);

  const jsonLdResult = extractPriceFromJsonLd(html);
  if (jsonLdResult !== null) return jsonLdResult;

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    throw new PriceFetcherError("Invalid or malformed HTML", "INVALID_HTML");
  }

  const selectorResult = extractPriceFromSelectors($, selector);
  if (selectorResult !== null) return selectorResult;

  throw new PriceFetcherError(
    "Could not extract a valid price from the page",
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
  priceType: "sale" | "full" | null;
  salePercentage?: number | null;
  wasPrice?: number | null;
  isOnSpecial?: boolean | null;
  isHalfPrice?: boolean | null;
  savings?: number | null;
};

/**
 * Fetches a product page and extracts both price and title in a single request.
 * Uses same multi-strategy price extraction as fetchPrice.
 */
export async function fetchProductInfo(
  url: string,
  config: PriceFetcherConfig
): Promise<FetchProductInfoResult> {
  const { selector, timeoutMs = DEFAULT_TIMEOUT_MS } = config;

  let price: number | null = null;
  let priceType: "sale" | "full" | null = null;
  let salePercentage: number | null = null;
  let wasPrice: number | null = null;
  let isOnSpecial: boolean | null = null;
  let isHalfPrice: boolean | null = null;
  let savings: number | null = null;

  try {
    const woolworths = await fetchWoolworthsPrice(url);
    if (woolworths) {
      price = woolworths.price;
      priceType = woolworths.priceType;
      salePercentage = woolworths.salePercentage ?? null;
      wasPrice = woolworths.wasPrice ?? null;
      isOnSpecial = woolworths.isOnSpecial ?? null;
      isHalfPrice = woolworths.isHalfPrice ?? null;
      savings = woolworths.savings ?? null;
    }
  } catch {
    // continue
  }

  const html = await fetchHtml(url, timeoutMs ?? DEFAULT_TIMEOUT_MS);

  if (price === null) {
    const jsonLd = extractPriceFromJsonLd(html);
    if (jsonLd) {
      price = jsonLd.price;
      priceType = jsonLd.priceType;
      salePercentage = jsonLd.salePercentage ?? null;
      wasPrice = jsonLd.wasPrice ?? null;
    }
  }

  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return {
      price,
      title: PLACEHOLDER_TITLE,
      priceType,
      salePercentage,
      wasPrice,
      isOnSpecial,
      isHalfPrice,
      savings,
    };
  }

  if (price === null) {
    const selectorResult = extractPriceFromSelectors($, selector);
    if (selectorResult) {
      price = selectorResult.price;
      priceType = selectorResult.priceType;
      salePercentage = selectorResult.salePercentage ?? null;
      wasPrice = selectorResult.wasPrice ?? null;
    }
  }

  const title = extractTitle($);
  return {
    price,
    title,
    priceType,
    salePercentage,
    wasPrice,
    isOnSpecial,
    isHalfPrice,
    savings,
  };
}

const DEFAULT_PRICE_SELECTOR =
  ".price, .product-price, [data-price], #price, span[class*='price']";

/**
 * Price selectors to try in order. Sale/discounted selectors first for better match.
 * Note: Selector match alone does not indicate sale - we mark as "full" without wasPrice/savings.
 */
const PRICE_SELECTORS = [
  "[data-sale-price]",
  "[data-product-price]",
  ".sale-price",
  ".promo-price",
  ".product-price--sale",
  ".price--sale",
  ".price-block__sale-price",
  ".product-price-promo",
  "#priceblock_dealprice",
  "#priceblock_saleprice",
  "[data-price]",
  ".price",
  ".product-price",
  ".product__price",
  ".product-detail__price",
  "#price",
  "#productPrice",
  ".woocommerce-Price-amount",
  "span[class*='price']",
  "[class*='Price']",
  ".sf-pricedisplay",
];

export type PriceResult = {
  price: number;
  priceType: "sale" | "full" | null;
  salePercentage?: number | null;
  wasPrice?: number | null;
  /** Woolworths: product is on special */
  isOnSpecial?: boolean | null;
  /** Woolworths: half-price promotion */
  isHalfPrice?: boolean | null;
  /** Woolworths: dollar amount saved (e.g. 2.50) */
  savings?: number | null;
};

/**
 * Woolworths native price object: { current, was, cupPrice, cupMeasure, savings, ... }
 * IMPORTANT: cupPrice is per 100g/ml - must NEVER be used as product price.
 */
function getWoolworthsPriceFromNested(
  data: Record<string, unknown>
): { current: number; was: number | null; savings: number | null } | null {
  const tryPriceObj = (p: Record<string, unknown> | null | undefined) => {
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const current =
      (p.current as number) ?? (p.Current as number) ?? (p.product_price as number);
    if (typeof current !== "number" || current <= 0) return null;
    const was =
      (p.was as number) ?? (p.Was as number) ?? (p.wasPrice as number) ?? (p.WasPrice as number);
    const wasPrice = typeof was === "number" && was > 0 ? was : null;
    const savingsRaw = (p.savings as number) ?? (p.Savings as number);
    const savings =
      typeof savingsRaw === "number" && savingsRaw > 0 ? savingsRaw : null;
    return { current, was: wasPrice, savings };
  };

  const topLevel = tryPriceObj(data?.price as Record<string, unknown>);
  if (topLevel) return topLevel;

  const graph = data?.["@graph"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(graph)) {
    for (const item of graph) {
      const found = tryPriceObj(item?.price as Record<string, unknown>);
      if (found) return found;
      const product = item?.Product ?? item?.product;
      if (product && typeof product === "object") {
        const found2 = tryPriceObj((product as Record<string, unknown>)?.price as Record<string, unknown>);
        if (found2) return found2;
      }
    }
  }
  return null;
}

function getNestedOfferPrice(obj: Record<string, unknown>): number | null {
  const offers = obj?.offers;
  let offer: Record<string, unknown> | undefined;
  if (Array.isArray(offers) && offers.length > 0) {
    offer = offers[0] as Record<string, unknown>;
  } else if (offers && typeof offers === "object") {
    offer = offers as Record<string, unknown>;
  }
  if (!offer) return null;

  const p = offer?.price ?? offer?.lowPrice;
  return typeof p === "number" && p > 0 ? p : null;
}

function getNestedWasPrice(obj: Record<string, unknown>): number | null {
  const offers = obj?.offers;
  let offer: Record<string, unknown> | undefined;
  if (Array.isArray(offers) && offers.length > 0) {
    offer = offers[0] as Record<string, unknown>;
  } else if (offers && typeof offers === "object") {
    offer = offers as Record<string, unknown>;
  }
  if (!offer) return null;
  const spec = offer?.priceSpecification as Record<string, unknown> | undefined;
  if (spec) {
    const p = spec?.price ?? spec?.value;
    return typeof p === "number" && p > 0 ? p : null;
  }
  return (offer?.highPrice as number) ?? (obj?.wasPrice as number) ?? (obj?.was as number) ?? null;
}

/**
 * Tries to fetch price from Woolworths Australia API.
 *
 * Price structure (native format):
 *   price.current = total product price (sale price when on sale)
 *   price.was = original total price
 *   price.cupPrice = per 100g/ml - NEVER use as product price
 *   price.savings = dollar amount saved (product is on sale ONLY when this > 0)
 */
async function fetchWoolworthsPrice(url: string): Promise<PriceResult | null> {
  try {
    const parsed = new URL(url);
    if (
      !parsed.hostname.includes("woolworths.com.au") &&
      !parsed.hostname.includes("woolworths.co.za")
    ) {
      return null;
    }
    const pathMatch = parsed.pathname.match(/\/productdetails\/(\d+)/);
    const productId = pathMatch?.[1];
    if (!productId) return null;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    };

    const productApiUrl = `https://www.woolworths.com.au/api/v3/ui/product/${productId}`;
    const schemaOrgApiUrl = `https://www.woolworths.com.au/api/v3/ui/schemaorg/product/${productId}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8_000);

    let data: Record<string, unknown>;
    const productRes = await fetch(productApiUrl, {
      signal: controller.signal,
      headers,
    });
    if (productRes.ok) {
      const productData = (await productRes.json()) as Record<string, unknown>;
      if (getWoolworthsPriceFromNested(productData)) {
        data = productData;
      } else {
        const schemaRes = await fetch(schemaOrgApiUrl, {
          signal: controller.signal,
          headers,
        });
        if (!schemaRes.ok) return null;
        data = (await schemaRes.json()) as Record<string, unknown>;
      }
    } else {
      const schemaRes = await fetch(schemaOrgApiUrl, {
        signal: controller.signal,
        headers,
      });
      if (!schemaRes.ok) return null;
      data = (await schemaRes.json()) as Record<string, unknown>;
    }
    clearTimeout(timeoutId);

    let price: number;
    let wasPrice: number | null;
    let savings: number | null;

    const nested = getWoolworthsPriceFromNested(data);
    if (nested) {
      price = nested.current;
      wasPrice = nested.was;
      savings = nested.savings;
    } else {
      const offerPrice = getNestedOfferPrice(data);
      const flatPrice =
        (data?.product_price as number) ??
        (data?.ProductPrice as number) ??
        (data?.Price as number);
      const p =
        offerPrice ??
        (typeof data?.price === "number" ? (data.price as number) : null) ??
        (data?.lowPrice as number) ??
        flatPrice;
      if (typeof p !== "number" || p <= 0) return null;
      price = p;

      wasPrice =
        getNestedWasPrice(data) ??
        (typeof (data?.WasPrice as number) === "number" ? (data.WasPrice as number) : null) ??
        (typeof (data?.wasPrice as number) === "number" ? (data.wasPrice as number) : null) ??
        (typeof (data?.was as number) === "number" ? (data.was as number) : null);

      const savingsRaw = (data?.Savings as number) ?? (data?.savings as number);
      savings =
        typeof savingsRaw === "number" && savingsRaw > 0 ? savingsRaw : null;
    }

    const priceObj = data?.price as Record<string, unknown> | undefined;
    const isHalfPrice =
      priceObj?.IsHalfPrice === true ||
      priceObj?.isHalfPrice === true ||
      data?.IsHalfPrice === true ||
      data?.isHalfPrice === true;
    const isOnSpecial =
      priceObj?.IsOnSpecial === true ||
      priceObj?.isOnSpecial === true ||
      data?.IsOnSpecial === true ||
      data?.isOnSpecial === true ||
      (typeof (data?.Savings as number) === "number" && (data.Savings as number) > 0) ||
      (typeof (data?.savings as number) === "number" && (data.savings as number) > 0);

    let salePercentage: number | null = null;
    const hasDiscountFromWasPrice =
      typeof wasPrice === "number" &&
      wasPrice > 0 &&
      wasPrice > price;
    if (savings != null && savings > 0 || hasDiscountFromWasPrice) {
      if (isHalfPrice) {
        salePercentage = 50;
      } else if (hasDiscountFromWasPrice) {
        salePercentage = Math.round(((wasPrice! - price) / wasPrice!) * 100);
      }
    }

    const isSale =
      (savings != null && savings > 0) || hasDiscountFromWasPrice;
    return {
      price,
      priceType: isSale ? "sale" : "full",
      salePercentage: salePercentage ?? undefined,
      wasPrice: typeof wasPrice === "number" && wasPrice > 0 ? wasPrice : undefined,
      isOnSpecial: isOnSpecial || undefined,
      isHalfPrice: isHalfPrice || undefined,
      savings: savings ?? undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts price from JSON-LD Product schema in HTML.
 */
function extractPriceFromJsonLd(html: string): PriceResult | null {
  const scriptMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!scriptMatch) return null;

  for (const match of scriptMatch) {
    const content = match.replace(
      /<script[^>]*>([\s\S]*?)<\/script>/i,
      "$1"
    ).trim();
    try {
      const json = JSON.parse(content) as Record<string, unknown>;
      const process = (obj: Record<string, unknown>): PriceResult | null => {
        const offers = obj?.offers as
          | {
              price?: number;
              lowPrice?: number;
              highPrice?: number;
              priceSpecification?: { price?: number; value?: number };
            }
          | undefined;
        if (!offers) return null;
        const price = offers.price ?? offers.lowPrice;
        if (typeof price !== "number" || price <= 0) return null;
        const spec = offers.priceSpecification;
        const wasPrice =
          (spec?.price ?? spec?.value) ?? offers.highPrice;
        let salePercentage: number | null = null;
        if (
          typeof wasPrice === "number" &&
          wasPrice > 0 &&
          wasPrice > price
        ) {
          salePercentage = Math.round(((wasPrice - price) / wasPrice) * 100);
        }
        const isSale = salePercentage !== null;
        return {
          price,
          priceType: isSale ? "sale" : "full",
          salePercentage: salePercentage ?? undefined,
          wasPrice:
            typeof wasPrice === "number" && wasPrice > 0 ? wasPrice : undefined,
        };
      };
      const graph = json["@graph"] as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(graph)) {
        for (const item of graph) {
          const type = item["@type"] as string | undefined;
          if (type === "Product" || type?.includes("Product")) {
            const p = process(item);
            if (p !== null) return p;
          }
        }
      }
      const type = json["@type"] as string | undefined;
      if (type === "Product" || type?.includes("Product")) {
        const p = process(json);
        if (p !== null) return p;
      }
    } catch {
      // skip invalid JSON
    }
  }
  return null;
}

/**
 * Tries to extract price from HTML using multiple selectors.
 */
function extractPriceFromSelectors(
  $: cheerio.CheerioAPI,
  customSelectors?: string
): PriceResult | null {
  const custom = customSelectors
    ? customSelectors.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const toTry = [...custom, ...PRICE_SELECTORS];

  for (let idx = 0; idx < toTry.length; idx++) {
    const sel = toTry[idx];

    if (sel.startsWith("[")) {
      const els = $(sel);
      for (let i = 0; i < els.length; i++) {
        const attr =
          $(els[i]).attr("data-sale-price") ??
          $(els[i]).attr("data-product-price") ??
          $(els[i]).attr("data-price");
        if (attr) {
          const num = parsePriceFromText(attr);
          if (num !== null && num > 0) {
            return {
              price: num,
              priceType: "full",
            };
          }
        }
        const text = $(els[i]).text().trim();
        const num = parsePriceFromText(text);
        if (num !== null && num > 0) {
          return { price: num, priceType: "full" };
        }
      }
    } else {
      const els = $(sel);
      for (let i = 0; i < els.length; i++) {
        const text = $(els[i]).text().trim();
        const num = parsePriceFromText(text);
        if (num !== null && num > 0) {
          return { price: num, priceType: "full" };
        }
      }
    }
  }
  return null;
}

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
