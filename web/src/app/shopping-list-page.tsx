import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type Product, type ShoppingListGroup, type ShoppingListItem } from '@/lib/api'
import { ItemAutocompleteField } from '@/components/item-autocomplete-field'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type DraftEntry = {
  itemId?: string
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

      <div className="flex items-center gap-2">
        <Button disabled={item.quantity <= 1} onClick={() => onDecrease(item)} size="sm" type="button" variant="outline">
          -
        </Button>
        <Badge variant="outline">{item.quantity}</Badge>
        <Button onClick={() => onIncrease(item)} size="sm" type="button" variant="outline">
          +
        </Button>
      </div>

      <Button aria-label={t('shoppingList.removeItem')} onClick={() => onDelete(item.id)} size="icon-sm" type="button" variant="ghost">
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

export const ShoppingListPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [draftEntry, setDraftEntry] = useState<DraftEntry>({ name: '', quantity: 1 })
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
    mutationFn: () => api.addShoppingListItem({
      itemId: draftEntry.itemId,
      name: draftEntry.itemId ? undefined : draftEntry.name,
      quantity: draftEntry.quantity,
    }),
    onSuccess: async () => {
      setDraftEntry({ name: '', quantity: 1 })
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

  const handleSuggestionSelect = (product: Product) => {
    setDraftEntry((currentValue) => ({
      ...currentValue,
      itemId: product.id,
      name: product.name,
    }))
  }

  const handleNameChange = (value: string) => {
    setDraftEntry((currentValue) => ({
      ...currentValue,
      itemId: value === currentValue.name ? currentValue.itemId : undefined,
      name: value,
    }))
  }

  if (shoppingListQuery.isPending) {
    return null
  }

  const shoppingList = shoppingListQuery.data ?? { groups: [], items: [] }
  const checkedCount = shoppingList.items.filter((item) => item.checked).length

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
        description={t('shoppingList.description')}
        title={t('shoppingList.title')}
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.08)]">
        <CardHeader>
          <CardTitle>{t('shoppingList.quickAddTitle')}</CardTitle>
          <CardDescription>{t('shoppingList.quickAddDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ItemAutocompleteField
            onChange={handleNameChange}
            onSelectSuggestion={handleSuggestionSelect}
            placeholder={t('shoppingList.itemPlaceholder')}
            value={draftEntry.name}
          />

          <div className="grid gap-3 sm:grid-cols-[112px_auto]">
            <div className="space-y-2">
              <Label htmlFor="shopping-list-quantity">{t('shoppingList.quantityLabel')}</Label>
              <Input
                id="shopping-list-quantity"
                min={1}
                onChange={(event) => setDraftEntry((currentValue) => ({
                  ...currentValue,
                  quantity: Number.parseInt(event.target.value, 10) || 1,
                }))}
                type="number"
                value={String(draftEntry.quantity)}
              />
            </div>
            <Button
              className="self-end"
              disabled={addItemMutation.isPending || !draftEntry.name.trim()}
              onClick={() => addItemMutation.mutate(undefined, { onError: handleMutationError })}
              type="button"
            >
              <Plus className="size-4" />
              <span>{t('shoppingList.addItem')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        {shoppingList.groups.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{t('shoppingList.empty')}</CardContent>
          </Card>
        )}

        {shoppingList.groups.map((group: ShoppingListGroup, index: number) => (
          <Card className="border-border/60 bg-card/90" key={group.category?.id ?? `uncategorized-${index}`}>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{group.category?.name ?? t('shoppingList.uncategorized')}</CardTitle>
              <CardDescription>{t('shoppingList.groupCount', { count: group.items.length })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {group.items.map((item) => (
                <ShoppingListRow
                  item={item}
                  key={item.id}
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
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
