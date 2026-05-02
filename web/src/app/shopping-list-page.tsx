import { useState } from 'react'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type ShoppingListItem } from '@/lib/api'
import { ShoppingListPageSkeleton } from '@/components/page-skeleton'
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
  isDecrementPending: boolean
  isDeletePending: boolean
  isIncrementPending: boolean
  item: ShoppingListItem
  isTogglePending: boolean
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

const ShoppingListRow = ({ isDecrementPending, isDeletePending, isIncrementPending, item, isTogglePending, onDecrease, onDelete, onIncrease, onToggle }: ShoppingListRowProps) => {
  const { t } = useTranslation()
  const isRowPending = isDecrementPending || isDeletePending || isIncrementPending || isTogglePending

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/75 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
      <button
        aria-label={t('shoppingList.toggleItem')}
        aria-busy={isTogglePending || undefined}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-xl text-left outline-none transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring/30"
        disabled={isRowPending}
        onClick={() => onToggle(item.id)}
        type="button"
      >
        <span className="inline-flex shrink-0 items-center justify-center">
          {isTogglePending && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
          {!isTogglePending && (item.checked ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />)}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium sm:text-base ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.item.name}</p>
        </div>
      </button>

      <QuantityStepper
        decrementLoading={isDecrementPending}
        disabled={isRowPending}
        incrementLoading={isIncrementPending}
        onChange={(quantity) => {
          if (quantity < item.quantity) {
            onDecrease(item)
            return
          }

          onIncrease(item)
        }}
        value={item.quantity}
      />

      <Button aria-label={t('shoppingList.removeItem')} disabled={isRowPending} loading={isDeletePending} onClick={() => onDelete(item.id)} size="icon-sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

const ShoppingListDraftRow = ({ disabled, draftEntry, onClose, onQuantityChange, onSelectionChange, onValueChange }: ShoppingListDraftRowProps) => {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border/60 bg-background/75 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
      <ProductPickerField
        autoFocus
        disabled={disabled}
        loading={disabled}
        onSelectionChange={onSelectionChange}
        onValueChange={onValueChange}
        placeholder={t('shoppingList.itemPlaceholder')}
        value={draftEntry.name}
      />

      <div className="shrink-0">
        <QuantityStepper disabled={disabled} onChange={onQuantityChange} value={draftEntry.quantity} />
      </div>

      <Button aria-label={t('shoppingList.removeItem')} className="shrink-0" disabled={disabled} onClick={onClose} size="icon-sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export const ShoppingListPage = () => {
  const { t } = useTranslation()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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
    mutationKey: ['shopping-list', 'add-item'],
    mutationFn: (input: { itemId?: string; name?: string; quantity: number }) => api.addShoppingListItem(input),
    onSuccess: async () => {
      setDraftEntry(createDraftEntry())
      setDraftEntryVersion((currentValue) => currentValue + 1)
      await refreshShoppingList()
    },
  })
  const toggleItemMutation = useMutation({
    mutationKey: ['shopping-list', 'toggle-item'],
    mutationFn: (shoppingListItemId: string) => api.toggleShoppingListItem(shoppingListItemId),
    onSuccess: refreshShoppingList,
  })
  const updateItemMutation = useMutation({
    mutationKey: ['shopping-list', 'update-item'],
    mutationFn: ({ shoppingListItemId, quantity }: { quantity: number; shoppingListItemId: string }) => api.updateShoppingListItem(shoppingListItemId, quantity),
    onSuccess: refreshShoppingList,
  })
  const deleteCheckedMutation = useMutation({
    mutationKey: ['shopping-list', 'delete-checked'],
    mutationFn: api.deleteCheckedShoppingListItems,
    onSuccess: async () => {
      setIsDeleteDialogOpen(false)
      await refreshShoppingList()
    },
  })
  const deleteItemMutation = useMutation({
    mutationKey: ['shopping-list', 'delete-item'],
    mutationFn: (shoppingListItemId: string) => api.deleteShoppingListItem(shoppingListItemId),
    onSuccess: refreshShoppingList,
  })

  const pendingToggledItemIds = useMutationState({
    filters: { mutationKey: ['shopping-list', 'toggle-item'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  const pendingDeletedItemIds = useMutationState({
    filters: { mutationKey: ['shopping-list', 'delete-item'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  const pendingUpdatedItems = useMutationState({
    filters: { mutationKey: ['shopping-list', 'update-item'], status: 'pending' },
    select: (mutation) => mutation.state.variables as { quantity: number; shoppingListItemId: string },
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
    return <ShoppingListPageSkeleton title={t('shoppingList.title')} titleClassName="text-2xl sm:text-4xl" />
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
          <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
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
                <Button loading={deleteCheckedMutation.isPending} onClick={() => deleteCheckedMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="destructive">
                  {t('shoppingList.deleteCheckedConfirm')}
                </Button>
                <DialogClose asChild>
                  <Button disabled={deleteCheckedMutation.isPending} type="button" variant="outline">{t('shoppingList.cancel')}</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
        title={t('shoppingList.title')}
        titleClassName="text-2xl sm:text-4xl"
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {shoppingList.items.length === 0 && !draftEntry && (
          <Card>
            <CardContent className="space-y-4 p-5 sm:p-6">
              <p className="text-sm text-muted-foreground">{t('shoppingList.empty')}</p>
              <ShoppingListAddButton onClick={handleOpenDraftEntry} />
            </CardContent>
          </Card>
        )}

        {shoppingList.items.length === 0 && draftEntry && renderDraftRow()}

        {shoppingList.items.length > 0 && (
          <Card className="border-border/60 bg-card/90">
            <CardContent className="space-y-4 p-3 sm:space-y-6 sm:p-6">
              {shoppingList.items.map((item, index) => {
                const previousItem = shoppingList.items[index - 1]
                const pendingUpdate = pendingUpdatedItems.find((pendingItem) => pendingItem.shoppingListItemId === item.id)
                const previousCategoryId = previousItem?.item.category?.id ?? null
                const currentCategoryId = item.item.category?.id ?? null
                const isDecrementPending = pendingUpdate?.quantity === item.quantity - 1
                const isIncrementPending = pendingUpdate?.quantity === item.quantity + 1
                const shouldShowCategoryHeading = index === 0 || currentCategoryId !== previousCategoryId

                return (
                  <section className="space-y-2 sm:space-y-3" key={item.id}>
                    {shouldShowCategoryHeading && (
                      <div className="px-1">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground sm:text-sm">
                          {item.item.category?.name ?? t('shoppingList.uncategorized')}
                        </h2>
                      </div>
                    )}

                    <div className="space-y-2 sm:space-y-3">
                      <ShoppingListRow
                        isDecrementPending={Boolean(isDecrementPending)}
                        isDeletePending={pendingDeletedItemIds.includes(item.id)}
                        isIncrementPending={Boolean(isIncrementPending)}
                        item={item}
                        isTogglePending={pendingToggledItemIds.includes(item.id)}
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
