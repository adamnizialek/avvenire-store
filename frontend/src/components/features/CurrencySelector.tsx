import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useCurrencyStore } from '@/stores/currencyStore';
import { CURRENCIES, SUPPORTED_CURRENCIES } from '@/lib/currency';

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrencyStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 text-sm">
          {currency}
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_CURRENCIES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setCurrency(code)}
            className={currency === code ? 'font-bold' : ''}
          >
            {CURRENCIES[code].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
