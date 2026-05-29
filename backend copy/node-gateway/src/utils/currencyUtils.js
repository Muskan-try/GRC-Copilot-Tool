/**
 * Currency Utilities for Backend
 */

const REGION_CURRENCY_MAP = {
  "United States": "USD",
  "India": "INR",
  "European Union": "EUR",
  "United Kingdom": "GBP",
  "Southeast Asia": "SGD",
  "Global": "USD",
  "Global/Multi-region": "USD",
};

const FRAMEWORK_CURRENCY_MAP = {
  "GDPR": "EUR",
  "DPDPA": "INR",
  "HIPAA": "USD",
  "CCPA": "USD",
  "SOC 2": "USD",
  "ISO": "USD",
};

/**
 * Gets the default currency for a given region and/or framework
 */
function getDefaultCurrencyForRegion(region, framework) {
  // 1. Try region exact match (if not Global)
  if (region && region !== "Global" && region !== "Global/Multi-region" && REGION_CURRENCY_MAP[region]) {
    return REGION_CURRENCY_MAP[region];
  }
  
  // 2. Try framework fallback (Higher priority than 'Global' region)
  if (framework) {
    for (const [key, value] of Object.entries(FRAMEWORK_CURRENCY_MAP)) {
      if (framework.toUpperCase().includes(key)) return value;
    }
  }

  // 3. Try region partial match
  if (region) {
    for (const [key, value] of Object.entries(REGION_CURRENCY_MAP)) {
      if (region.includes(key)) return value;
    }
  }
  
  return "USD";
}

module.exports = {
  getDefaultCurrencyForRegion,
  REGION_CURRENCY_MAP
};
