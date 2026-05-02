import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type ShoppingListItem } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { ProductPickerField, type ProductSelection } from '@/components/product-picker-field'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type DraftEntry = {
  name: string
  quantity: number
}

type ShoppingListRowProps = {
  item: ShoppingListItem
  onDecrease: (item: ShoppingListItem) => void
  onDelete: (itemId: string) => void
  onIncrease: (item: ShoppingListItem) => void
  onToggle: (itemId: string) => void
}

type ShoppingListAddButtonProps = {
  onClick: () => void
}

type ShoppingListDraftRowProps = {
  disabled: boolean
  draftEntry: DraftEntry
  onClose: () => void
  onQuantityChange: (quantity: number) => void
  onSelectionChange: (selection: ProductSelection) => void
  onValueChange: (value: string) => void
}

const createDraftEntry = (): DraftEntry => {
  return {
    name: '',
    quantity: 1,
  }
}

const ShoppingListAddButton = ({ onClick }: ShoppingListAddButtonProps) => {
  const { t } = useTranslation()

  return (
    <Button onClick={onClick} type="button" variant="outline">
      <Plus className="size-4" />
      <span>{t('shoppingList.addItem')}</span>
    </Button>
  )
}

const ShoppingListRow = ({ item, onDecrease, onDelete, onIncrease, onToggle }: ShoppingListRowProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/75 px-3 py-3">
      <Button aria-label={t('shoppingList.toggleItem')} className="shrink-0" onClick={() => onToggle(item.id)} size="icon-sm" type="button" variant="ghost">
        {item.checked ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
      </Button>

      <div className="min-w-0 flex-1">
        <p className={`font-medium ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.item.name}</p>
        {item.item.category && <p className="text-xs text-muted-foreground">{item.item.category.name}</p>}
      </div>

      <QuantityStepper onChange={(quantity) => {
        if (quantity < item.quantity) {
          onDecrease(item)
          return
        }

        onIncrease(item)
      }} value={item.quantity} />

      <Button aria-label={t('shoppingList.removeItem')} onClick={() => onDelete(item.id)} size="icon-sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

const ShoppingListDraftRow = ({ disabled, draftEntry, onClose, onQuantityChange, onSelectionChange, onValueChange }: ShoppingListDraftRowProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border/60 bg-background/75 px-3 py-3 sm:flex-row sm:items-start">
      <ProductPickerField
        autoFocus
        disabled={disabled}
        onSelectionChange={onSelectionChange}
        onValueChange={onValueChange}
        placeholder={t('shoppingList.itemPlaceholder')}
        value={draftEntry.name}
      />

      <div className="self-end sm:self-center">
        <QuantityStepper disabled={disabled} onChange={onQuantityChange} value={draftEntry.quantity} />
      </div>

      <Button aria-label={t('shoppingList.removeItem')} disabled={disabled} onClick={onClose} size="icon-sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export const ShoppingListPage = () => {
  const { t } = useTranslation()
  const [draftEntryVersion, setDraftEntryVersion] = useState(0)
  const queryClient = useQueryClient()
  const [draftEntry, setDraftEntry] = useState<DraftEntry | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const shoppingListQuery = useQuery({
    queryFn: api.getShoppingList,
    queryKey: ['shopping-list'],
  })

  const refreshShoppingList = async () => {
    setPageError(null)
    await queryClient.invalidateQueries({ queryKey: ['shopping-list'] })
  }

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 400) {
      setPageError(t('shoppingList.invalidInput'))
      return
    }

    setPageError(t('shoppingList.genericError'))
  }

  const addItemMutation = useMutation({
    mutationFn: (input: { itemId?: string; name?: string; quantity: number }) => api.addShoppingListItem(input),
    onSuccess: async () => {
      setDraftEntry(createDraftEntry())
      setDraftEntryVersion((currentValue) => currentValue + 1)
      await refreshShoppingList()
    },
  })
  const toggleItemMutation = useMutation({
    mutationFn: (shoppingListItemId: string) => api.toggleShoppingListItem(shoppingListItemId),
    onSuccess: refreshShoppingList,
  })
  const updateItemMutation = useMutation({
    mutationFn: ({ shoppingListItemId, quantity }: { quantity: number; shoppingListItemId: string }) => api.updateShoppingListItem(shoppingListItemId, quantity),
    onSuccess: refreshShoppingList,
  })
  const deleteCheckedMutation = useMutation({
    mutationFn: api.deleteCheckedShoppingListItems,
    onSuccess: refreshShoppingList,
  })
  const deleteItemMutation = useMutation({
    mutationFn: (shoppingListItemId: string) => api.deleteShoppingListItem(shoppingListItemId),
    onSuccess: refreshShoppingList,
  })

  const handleOpenDraftEntry = () => {
    setPageError(null)
    setDraftEntry(createDraftEntry())
    setDraftEntryVersion((currentValue) => currentValue + 1)
  }

  const handleDraftEntrySelection = (selection: ProductSelection) => {
    if (!draftEntry) {
      return
    }

    addItemMutation.mutate({
      itemId: selection.type === 'existing' ? selection.product.id : undefined,
      name: selection.type === 'create' ? selection.name : undefined,
      quantity: draftEntry.quantity,
    }, { onError: handleMutationError })
  }

  const handleDraftEntryNameChange = (value: string) => {
    setDraftEntry((currentValue) => ({
      name: value,
      quantity: currentValue?.quantity ?? 1,
    }))
  }

  const handleDraftEntryQuantityChange = (quantity: number) => {
    setDraftEntry((currentValue) => currentValue ? {
      ...currentValue,
      quantity,
    } : currentValue)
  }

  if (shoppingListQuery.isPending) {
    return null
  }

  const shoppingList = shoppingListQuery.data ?? { groups: [], items: [] }
  const checkedCount = shoppingList.items.filter((item) => item.checked).length
  const renderDraftRow = () => draftEntry ? (
    <ShoppingListDraftRow
      disabled={addItemMutation.isPending}
      draftEntry={draftEntry}
      key={draftEntryVersion}
      onClose={() => setDraftEntry(null)}
      onQuantityChange={handleDraftEntryQuantityChange}
      onSelectionChange={handleDraftEntrySelection}
      onValueChange={handleDraftEntryNameChange}
    />
  ) : null

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={checkedCount === 0 || deleteCheckedMutation.isPending} variant="outline">
                {t('shoppingList.deleteChecked')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('shoppingList.deleteCheckedTitle')}</DialogTitle>
                <DialogDescription>{t('shoppingList.deleteCheckedDescription')}</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button onClick={() => deleteCheckedMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="destructive">
                    {t('shoppingList.deleteCheckedConfirm')}
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{t('shoppingList.cancel')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        title={t('shoppingList.title')}
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {shoppingList.items.length === 0 && !draftEntry && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-sm text-muted-foreground">{t('shoppingList.empty')}</p>
              <ShoppingListAddButton onClick={handleOpenDraftEntry} />
            </CardContent>
          </Card>
        )}

        {shoppingList.items.length === 0 && draftEntry && renderDraftRow()}

        {shoppingList.items.length > 0 && (
          <Card className="border-border/60 bg-card/90">
            <CardContent className="space-y-6 p-4 sm:p-6">
              {shoppingList.items.map((item, index) => {
                const previousItem = shoppingList.items[index - 1]
                const previousCategoryId = previousItem?.item.category?.id ?? null
                const currentCategoryId = item.item.category?.id ?? null
                const shouldShowCategoryHeading = index === 0 || currentCategoryId !== previousCategoryId

                return (
                  <section className="space-y-3" key={item.id}>
                    {shouldShowCategoryHeading && (
                      <div className="px-1">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                          {item.item.category?.name ?? t('shoppingList.uncategorized')}
                        </h2>
                      </div>
                    )}

                    <div className="space-y-3">
                      <ShoppingListRow
                        item={item}
                        onDecrease={(currentItem) => updateItemMutation.mutate({
                          quantity: Math.max(1, currentItem.quantity - 1),
                          shoppingListItemId: currentItem.id,
                        }, { onError: handleMutationError })}
                        onDelete={(shoppingListItemId) => deleteItemMutation.mutate(shoppingListItemId, { onError: handleMutationError })}
                        onIncrease={(currentItem) => updateItemMutation.mutate({
                          quantity: currentItem.quantity + 1,
                          shoppingListItemId: currentItem.id,
                        }, { onError: handleMutationError })}
                        onToggle={(shoppingListItemId) => toggleItemMutation.mutate(shoppingListItemId, { onError: handleMutationError })}
                      />
                    </div>
                  </section>
                )
              })}

              {draftEntry && renderDraftRow()}
              {!draftEntry && <ShoppingListAddButton onClick={handleOpenDraftEntry} />}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
