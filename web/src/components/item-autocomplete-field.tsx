import { useDeferredValue } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, type Product } from '@/lib/api'
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/command'
import { Input } from '@/components/ui/input'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type Props = {
  onChange: (value: string) => void
  onSelectSuggestion: (item: Product) => void
  placeholder: string
  value: string
}

export const ItemAutocompleteField = ({ onChange, onSelectSuggestion, placeholder, value }: Props) => {
  const { t } = useTranslation()
  const deferredValue = useDeferredValue(value)
  const suggestionsQuery = useQuery({
    enabled: deferredValue.trim().length > 0,
    queryFn: () => api.searchProducts(deferredValue.trim()),
    queryKey: ['product-search', deferredValue.trim()],
  })

  const suggestions = suggestionsQuery.data ?? []
  const showSuggestions = deferredValue.trim().length > 0

  return (
    <Popover open={showSuggestions}>
      <div className="relative space-y-2">
        <PopoverAnchor asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-7" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
          </div>
        </PopoverAnchor>

        {showSuggestions && (
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1">
            <Command shouldFilter={false}>
              <CommandList>
                {suggestions.length === 0 && <CommandEmpty>{t('products.searchEmpty')}</CommandEmpty>}
                {suggestions.map((suggestion) => {
                  const isSelected = suggestion.name === value

                  return (
                    <CommandItem
                      className={cn(isSelected && 'bg-muted text-foreground')}
                      key={suggestion.id}
                      onSelect={() => onSelectSuggestion(suggestion)}
                    >
                      <div>
                        <p className="font-medium text-foreground">{suggestion.name}</p>
                        {suggestion.category && <p className="text-xs text-muted-foreground">{suggestion.category.name}</p>}
                      </div>
                      {isSelected && <Check className="ml-auto size-4" />}
                    </CommandItem>
                  )
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </div>
    </Popover>
  )
}
