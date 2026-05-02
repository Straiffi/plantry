import { useState } from 'react'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Circle, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type MenuItem } from '@/lib/api'
import { MenuPageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

type MenuRowProps = {
  isAddToShoppingListPending: boolean
  isExpanded: boolean
  item: MenuItem
  isTogglePending: boolean
  onAddToShoppingList: (menuItemId: string) => void
  onToggleChecked: (menuItemId: string) => void
  onToggleExpanded: (menuItemId: string) => void
}

const MenuRow = ({ isAddToShoppingListPending, isExpanded, item, isTogglePending, onAddToShoppingList, onToggleChecked, onToggleExpanded }: MenuRowProps) => {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/75">
      <div className="flex items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
        <Button aria-label={t('menu.toggleItem')} className="shrink-0" loading={isTogglePending} onClick={() => onToggleChecked(item.id)} size="icon-sm" type="button" variant="ghost">
          {item.checked ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
        </Button>

        <button
          aria-expanded={isExpanded}
          aria-label={t('menu.toggleExpand')}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={() => onToggleExpanded(item.id)}
          type="button"
        >
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-medium sm:text-base ${item.checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{item.recipe.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('recipes.itemCount', { count: item.recipe.items.length })}</p>
          </div>

          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-border/60 px-3 py-3 sm:px-4">
          {item.recipe.notes && <p className="text-sm text-muted-foreground">{item.recipe.notes}</p>}

          <div className="space-y-2">
            {item.recipe.items.map((recipeItem) => (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 px-3 py-2" key={recipeItem.id}>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{recipeItem.item.name}</span>
                <Badge variant="muted">{recipeItem.quantity}x</Badge>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button loading={isAddToShoppingListPending} onClick={() => onAddToShoppingList(item.id)} type="button" variant="secondary">
              <Send className="size-4" />
              <span>{t('menu.addRecipeToShoppingList')}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export const MenuPage = () => {
  const { t } = useTranslation()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const queryClient = useQueryClient()
  const [expandedMenuItemId, setExpandedMenuItemId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const menuQuery = useQuery({
    queryFn: api.getMenu,
    queryKey: ['menu'],
  })

  const refreshMenu = async () => {
    setPageError(null)
    await queryClient.invalidateQueries({ queryKey: ['menu'] })
  }

  const refreshMenuAndRecipes = async () => {
    setPageError(null)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['menu'] }),
      queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    ])
  }

  const refreshShoppingList = async () => {
    setPageError(null)
    await queryClient.invalidateQueries({ queryKey: ['shopping-list'] })
  }

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      setPageError(t('menu.genericError'))
      return
    }

    setPageError(t('menu.genericError'))
  }

  const toggleMenuItemMutation = useMutation({
    mutationKey: ['menu', 'toggle-item'],
    mutationFn: (menuItemId: string) => api.toggleMenuItemChecked(menuItemId),
    onSuccess: refreshMenu,
  })
  const deleteCheckedMutation = useMutation({
    mutationKey: ['menu', 'delete-checked'],
    mutationFn: api.deleteCheckedMenuItems,
    onSuccess: async () => {
      setExpandedMenuItemId(null)
      setIsDeleteDialogOpen(false)
      await refreshMenuAndRecipes()
    },
  })
  const addMenuItemToShoppingListMutation = useMutation({
    mutationKey: ['menu', 'add-item-to-shopping-list'],
    mutationFn: (menuItemId: string) => api.addMenuItemToShoppingList(menuItemId),
    onSuccess: refreshShoppingList,
  })
  const addUncheckedMenuToShoppingListMutation = useMutation({
    mutationKey: ['menu', 'add-unchecked-to-shopping-list'],
    mutationFn: api.addUncheckedMenuToShoppingList,
    onSuccess: refreshShoppingList,
  })

  const pendingToggledMenuItemIds = useMutationState({
    filters: { mutationKey: ['menu', 'toggle-item'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  const pendingShoppingListMenuItemIds = useMutationState({
    filters: { mutationKey: ['menu', 'add-item-to-shopping-list'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })

  if (menuQuery.isPending) {
    return <MenuPageSkeleton title={t('menu.title')} titleClassName="text-2xl sm:text-4xl" />
  }

  const menu = menuQuery.data ?? { items: [] }
  const checkedCount = menu.items.filter((item) => item.checked).length
  const uncheckedCount = menu.items.filter((item) => !item.checked).length

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button className="w-full sm:w-auto" disabled={uncheckedCount === 0 || addUncheckedMenuToShoppingListMutation.isPending} loading={addUncheckedMenuToShoppingListMutation.isPending} onClick={() => addUncheckedMenuToShoppingListMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="outline">
              {t('menu.addAllToShoppingList')}
            </Button>

            <Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto" disabled={checkedCount === 0 || deleteCheckedMutation.isPending} variant="outline">
                  {t('menu.deleteChecked')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('menu.deleteCheckedTitle')}</DialogTitle>
                  <DialogDescription>{t('menu.deleteCheckedDescription')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button loading={deleteCheckedMutation.isPending} onClick={() => deleteCheckedMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="destructive">
                    {t('menu.deleteCheckedConfirm')}
                  </Button>
                  <DialogClose asChild>
                    <Button disabled={deleteCheckedMutation.isPending} type="button" variant="outline">{t('menu.cancel')}</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
        title={t('menu.title')}
        titleClassName="text-2xl sm:text-4xl"
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      {menu.items.length === 0 && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{t('menu.empty')}</CardContent>
        </Card>
      )}

      {menu.items.length > 0 && (
        <Card className="border-border/60 bg-card/90">
          <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-6">
            {menu.items.map((item) => (
              <MenuRow
                isAddToShoppingListPending={pendingShoppingListMenuItemIds.includes(item.id)}
                isExpanded={expandedMenuItemId === item.id}
                item={item}
                isTogglePending={pendingToggledMenuItemIds.includes(item.id)}
                key={item.id}
                onAddToShoppingList={(menuItemId) => addMenuItemToShoppingListMutation.mutate(menuItemId, { onError: handleMutationError })}
                onToggleChecked={(menuItemId) => toggleMenuItemMutation.mutate(menuItemId, { onError: handleMutationError })}
                onToggleExpanded={(menuItemId) => setExpandedMenuItemId((currentValue) => currentValue === menuItemId ? null : menuItemId)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
