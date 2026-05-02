import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'

import { api, type Product } from '@/lib/api'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  onChange: (value: string) => void
  onSelectSuggestion: (item: Product) => void
  placeholder: string
  value: string
}

export const ItemAutocompleteField = ({ onChange, onSelectSuggestion, placeholder, value }: Props) => {
  const deferredValue = useDeferredValue(value)
  const suggestionsQuery = useQuery({
    enabled: deferredValue.trim().length > 0,
    queryFn: () => api.searchProducts(deferredValue.trim()),
    queryKey: ['product-search', deferredValue.trim()],
  })

  const suggestions = suggestionsQuery.data ?? []
  const showSuggestions = deferredValue.trim().length > 0 && suggestions.length > 0

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      </div>

      {showSuggestions && (
        <div className="rounded-2xl border border-border/60 bg-card/95 p-2 shadow-[0_18px_48px_rgba(62,44,32,0.08)] backdrop-blur">
          <div className="space-y-1">
            {suggestions.map((suggestion) => {
              const isSelected = suggestion.name === value

              return (
                <button
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-primary/8',
                    isSelected && 'bg-primary/8 text-primary',
                  )}
                  key={suggestion.id}
                  onClick={() => onSelectSuggestion(suggestion)}
                  type="button"
                >
                  <div>
                    <p className="font-medium text-foreground">{suggestion.name}</p>
                    {suggestion.category && <p className="text-xs text-muted-foreground">{suggestion.category.name}</p>}
                  </div>
                  {isSelected && <Check className="size-4" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
