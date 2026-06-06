export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'PKR', name: 'Pakistani Rupee',     symbol: '₨'    },
  { code: 'USD', name: 'US Dollar',            symbol: '$'    },
  { code: 'AED', name: 'UAE Dirham',           symbol: 'د.إ'  },
  { code: 'EUR', name: 'Euro',                 symbol: '€'    },
  { code: 'GBP', name: 'British Pound',        symbol: '£'    },
  { code: 'SAR', name: 'Saudi Riyal',          symbol: '﷼'   },
  { code: 'CNY', name: 'Chinese Yuan',         symbol: '¥'    },
  { code: 'INR', name: 'Indian Rupee',         symbol: '₹'    },
  { code: 'TRY', name: 'Turkish Lira',         symbol: '₺'    },
  { code: 'KWD', name: 'Kuwaiti Dinar',        symbol: 'KD'   },
  { code: 'QAR', name: 'Qatari Riyal',         symbol: 'QR'   },
  { code: 'BHD', name: 'Bahraini Dinar',       symbol: 'BD'   },
  { code: 'OMR', name: 'Omani Rial',           symbol: 'OMR'  },
  { code: 'MYR', name: 'Malaysian Ringgit',    symbol: 'RM'   },
  { code: 'IDR', name: 'Indonesian Rupiah',    symbol: 'Rp'   },
  { code: 'THB', name: 'Thai Baht',            symbol: '฿'    },
  { code: 'BDT', name: 'Bangladeshi Taka',     symbol: '৳'    },
  { code: 'SGD', name: 'Singapore Dollar',     symbol: 'S$'   },
  { code: 'JPY', name: 'Japanese Yen',         symbol: '¥'    },
  { code: 'CHF', name: 'Swiss Franc',          symbol: 'Fr'   },
  { code: 'CAD', name: 'Canadian Dollar',      symbol: 'CA$'  },
  { code: 'AUD', name: 'Australian Dollar',    symbol: 'A$'   },
  { code: 'HKD', name: 'Hong Kong Dollar',     symbol: 'HK$'  },
  { code: 'KRW', name: 'South Korean Won',     symbol: '₩'    },
  { code: 'ZAR', name: 'South African Rand',   symbol: 'R'    },
  { code: 'VND', name: 'Vietnamese Dong',      symbol: '₫'    },
  { code: 'EGP', name: 'Egyptian Pound',       symbol: 'E£'   },
  { code: 'NGN', name: 'Nigerian Naira',       symbol: '₦'    },
];

/**
 * @deprecated Use `useBaseCurrency()` hook in components instead.
 * This constant is kept only as a static fallback for non-hook contexts.
 * The live base currency is stored in company settings (company_currency key).
 */
export const GLOBAL_SALE_CURRENCY = 'PKR';

const CURRENCY_MAP = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrency(code: string): Currency {
  return CURRENCY_MAP.get(code) ?? { code, name: code, symbol: code };
}

export function formatAmount(amount: number | string, currencyCode: string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    const { symbol } = getCurrency(currencyCode);
    return `${symbol} ${n.toLocaleString()}`;
  }
}
