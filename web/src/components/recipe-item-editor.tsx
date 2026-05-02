import { MinusCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ProductPickerField, type ProductSelection } from '@/components/product-picker-field'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'

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

  const handleNameChange = (value: string) => {
    onChange({
      ...item,
      itemId: value === item.name ? item.itemId : undefined,
      name: value,
    })
  }

  const handleSelectionChange = (selection: ProductSelection) => {
    onChange({
      ...item,
      itemId: selection.type === 'existing' ? selection.product.id : undefined,
      name: selection.type === 'existing' ? selection.product.name : selection.name,
    })
  }

  const handleQuantityChange = (quantity: number) => {
    onChange({
      ...item,
      quantity,
    })
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-background/70 p-3 sm:grid-cols-[1fr_112px_auto] sm:items-start">
      <ProductPickerField
        disabled={false}
        onSelectionChange={handleSelectionChange}
        onValueChange={handleNameChange}
        placeholder={t('recipes.form.itemPlaceholder')}
        value={item.name}
      />
      <div className="self-end sm:self-center">
        <QuantityStepper onChange={handleQuantityChange} value={item.quantity} />
      </div>
      <Button className="sm:self-center" onClick={onRemove} type="button" variant="ghost">
        <MinusCircle className="size-4" />
        <span>{t('recipes.form.removeItem')}</span>
      </Button>
    </div>
  )
}
