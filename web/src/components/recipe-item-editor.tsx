import { MinusCircle } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { Product } from '@/lib/api'
import { ItemAutocompleteField } from '@/components/item-autocomplete-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type RecipeDraftItem = {
  id: string
  itemId?: string
  name: string
  quantity: number
}

type Props = {
  item: RecipeDraftItem
  onChange: (item: RecipeDraftItem) => void
  onRemove: () => void
}

export const RecipeItemEditor = ({ item, onChange, onRemove }: Props) => {
  const { t } = useTranslation()

  const handleSelectSuggestion = (product: Product) => {
    onChange({
      ...item,
      itemId: product.id,
      name: product.name,
    })
  }

  const handleNameChange = (value: string) => {
    onChange({
      ...item,
      itemId: value === item.name ? item.itemId : undefined,
      name: value,
    })
  }

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...item,
      quantity: Number.parseInt(event.target.value, 10) || 1,
    })
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_112px_auto] sm:items-start">
      <ItemAutocompleteField
        onChange={handleNameChange}
        onSelectSuggestion={handleSelectSuggestion}
        placeholder={t('recipes.form.itemPlaceholder')}
        value={item.name}
      />
      <Input min={1} onChange={handleQuantityChange} type="number" value={String(item.quantity)} />
      <Button className="sm:self-center" onClick={onRemove} type="button" variant="ghost">
        <MinusCircle className="size-4" />
        <span>{t('recipes.form.removeItem')}</span>
      </Button>
    </div>
  )
}
