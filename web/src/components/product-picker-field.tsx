import { useDeferredValue, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoaderCircle, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, type Product } from '@/lib/api'
import { Input } from '@/components/ui/input'

export type ProductSelection =
  | { name: string; type: 'create' }
  | { product: Product; type: 'existing' }

type Option =
  | { categoryName?: string; product: Product; type: 'existing' }
  | { label: string; name: string; type: 'create' }

type Props = {
  autoFocus?: boolean
  disabled: boolean
  instanceKey?: string
  loading?: boolean
  onSelectionChange: (selection: ProductSelection) => void
  onValueChange: (value: string) => void
  placeholder: string
  value: string
}

const normalizeProductSearchValue = (value: string) => {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

const getCachedProductSuggestions = (products: Product[], query: string) => {
  const normalizedQuery = normalizeProductSearchValue(query)

  if (!normalizedQuery) {
    return []
  }

  return [...products]
    .filter((product) => product.normalizedName.startsWith(normalizedQuery))
    .sort((left, right) => left.name.localeCompare(right.name))
    .slice(0, 8)
}

export const ProductPickerField = ({ autoFocus = false, disabled, instanceKey, loading = false, onSelectionChange, onValueChange, placeholder, value }: Props) => {
  const { t } = useTranslation()
  const deferredValue = useDeferredValue(value)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const trimmedValue = value.trim()
  const deferredTrimmedValue = deferredValue.trim()
  const activeProductsQuery = useQuery({
    enabled: false,
    queryFn: () => api.getProducts(false),
    queryKey: ['products', 'active'],
  })
  const cachedActiveProducts = activeProductsQuery.data ?? null
  const hasCachedActiveProducts = cachedActiveProducts !== null
  const suggestionsQuery = useQuery({
    enabled: deferredTrimmedValue.length > 0 && !hasCachedActiveProducts,
    queryFn: () => api.searchProducts(deferredTrimmedValue),
    queryKey: ['product-search', deferredTrimmedValue],
  })

  const normalizedValue = normalizeProductSearchValue(trimmedValue)
  const isCurrentSearchSettled = hasCachedActiveProducts || (trimmedValue.length > 0 && deferredTrimmedValue === trimmedValue && !suggestionsQuery.isPending)
  const isSearchPending = trimmedValue.length > 0 && !hasCachedActiveProducts && !isCurrentSearchSettled
  const suggestions = hasCachedActiveProducts
    ? getCachedProductSuggestions(cachedActiveProducts, trimmedValue)
    : (isCurrentSearchSettled ? suggestionsQuery.data ?? [] : [])
  const exactMatchExists = suggestions.some((suggestion) => suggestion.name.trim().toLowerCase() === normalizedValue)
  const options: Option[] = suggestions.map((suggestion) => ({
    categoryName: suggestion.category?.name,
    product: suggestion,
    type: 'existing',
  }))

  if (isCurrentSearchSettled && trimmedValue && !exactMatchExists) {
    options.push({
      label: t('productPicker.createProduct', { name: trimmedValue }),
      name: trimmedValue,
      type: 'create',
    })
  }

  const showSuggestions = isFocused && trimmedValue.length > 0 && options.length > 0
  const showLoading = loading || isSearchPending

  const handleSelectOption = (option: Option) => {
    setActiveIndex(0)
    setIsFocused(false)

    if (option.type === 'existing') {
      onSelectionChange({ product: option.product, type: 'existing' })
      return
    }

    onSelectionChange({ name: option.name, type: 'create' })
  }

  const handleBlur = () => {
    window.setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsFocused(false)
      }
    }, 0)
  }

  return (
    <div className="relative min-w-0 flex-1" ref={containerRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      {showLoading && <LoaderCircle aria-hidden className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      <Input
        autoFocus={autoFocus}
        aria-busy={showLoading || undefined}
        className={showLoading ? 'pl-9 pr-9' : 'pl-9'}
        disabled={disabled}
        key={instanceKey}
        onBlur={handleBlur}
        onChange={(event) => {
          setActiveIndex(0)
          setIsFocused(true)
          onValueChange(event.target.value)
        }}
        onFocus={() => setIsFocused(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            if (options.length === 0) {
              return
            }

            event.preventDefault()
            setIsFocused(true)
            setActiveIndex((currentValue) => (currentValue + 1) % options.length)
            return
          }

          if (event.key === 'ArrowUp') {
            if (options.length === 0) {
              return
            }

            event.preventDefault()
            setIsFocused(true)
            setActiveIndex((currentValue) => (currentValue - 1 + options.length) % options.length)
            return
          }

          if (event.key === 'Enter' && showSuggestions && options[activeIndex]) {
            event.preventDefault()
            handleSelectOption(options[activeIndex])
            return
          }

          if (event.key === 'Escape') {
            setIsFocused(false)
          }
        }}
        placeholder={placeholder}
        value={value}
      />

      {showSuggestions && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-lg">
          <div className="max-h-72 overflow-y-auto p-1">
            {options.map((option, index) => (
              <button
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-muted text-foreground' : 'text-popover-foreground'}`}
                key={option.type === 'existing' ? option.product.id : option.label}
                onMouseDown={(event) => {
                  event.preventDefault()

                  if (disabled) {
                    return
                  }

                  handleSelectOption(option)
                }}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{option.type === 'existing' ? option.product.name : option.label}</p>
                  {option.type === 'existing' && option.categoryName && <p className="text-xs text-muted-foreground">{option.categoryName}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
