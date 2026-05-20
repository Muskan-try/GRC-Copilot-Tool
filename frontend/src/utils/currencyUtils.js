/**
 * Currency Utilities for GRC Copilot
 */

export const CURRENCY_CONFIG = {
  USD: { symbol: "$", locale: "en-US", rate: 1, label: "US Dollar" },
  INR: { symbol: "₹", locale: "en-IN", rate: 83.5, label: "Indian Rupee" },
  EUR: { symbol: "€", locale: "de-DE", rate: 0.94, label: "Euro" },
  GBP: { symbol: "£", locale: "en-GB", rate: 0.81, label: "British Pound" },
  SGD: { symbol: "S$", locale: "en-SG", rate: 1.36, label: "Singapore Dollar" },
};

export const REGION_CURRENCY_MAP = {
  "United States": "USD",
  "India": "INR",
  "European Union": "EUR",
  "United Kingdom": "GBP",
  "Southeast Asia": "SGD",
  "Global/Multi-region": "USD",
};

/**
 * Formats a value in the target currency
 * @param {number} value - The value in base currency (USD)
 * @param {string} currencyCode - The target currency code (USD, INR, etc.)
 * @param {boolean} compact - Whether to use compact notation (e.g., 1.2M)
 */
export const formatCurrency = (value, currencyCode = "USD", compact = false) => {
  const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.USD;
  const convertedValue = value * config.rate;

  const formatter = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currencyCode,
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: 2,
  });

  return formatter.format(convertedValue);
};

/**
 * Gets the default currency for a given region
 */
export const getDefaultCurrencyForRegion = (region) => {
  return REGION_CURRENCY_MAP[region] || "USD";
};
