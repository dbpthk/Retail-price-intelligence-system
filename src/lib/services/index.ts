import "server-only";

/**
 * Server-side services.
 * Do not import in client components.
 */

export {
  fetchPrice,
  fetchProductInfo,
  fetchTitle,
  PriceFetcherError,
  type PriceFetcherConfig,
  type FetchProductInfoResult,
} from "./price-fetcher";

export {
  sendPriceDropEmail,
  type PriceDropEmailParams,
} from "./email/price-drop";
