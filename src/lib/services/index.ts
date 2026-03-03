import "server-only";

/**
 * Server-side services.
 * Do not import in client components.
 */

export {
  fetchPrice,
  PriceFetcherError,
  type PriceFetcherConfig,
} from "./price-fetcher";

export {
  sendPriceDropEmail,
  type PriceDropEmailParams,
} from "./email/price-drop";
