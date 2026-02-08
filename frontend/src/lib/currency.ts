export const SUPPORTED_CURRENCIES = ['USD', 'PLN', 'EUR'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  rate: number;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', rate: 1.0, label: 'USD ($)' },
  PLN: { code: 'PLN', symbol: 'zł', locale: 'pl-PL', rate: 4.02, label: 'PLN (zł)' },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', rate: 0.92, label: 'EUR (€)' },
};

export const DEFAULT_CURRENCY: CurrencyCode = 'USD';

export function formatPrice(amountInUsd: number, currencyCode: CurrencyCode): string {
  const config = CURRENCIES[currencyCode] ?? CURRENCIES.USD;
  const converted = amountInUsd * config.rate;
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}
