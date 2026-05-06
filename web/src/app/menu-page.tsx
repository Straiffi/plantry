import { useState } from 'react'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, Circle, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type MenuItem } from '@/lib/api'
import { RecipeNotes } from '@/components/recipe-notes'
import { MenuPageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type MenuQueryData = Awaited<ReturnType<typeof api.getMenu>>

type ToggleMenuItemMutationContext = {
  previousMenu?: MenuQueryData
}

type DeleteCheckedMenuMutationContext = {
  previousExpandedMenuItemId: string | null
  previousMenu?: MenuQueryData
}

type MenuRowProps = {
  isAddToShoppingListPending: boolean
  isExpanded: boolean
  item: MenuItem
  isTogglePending: boolean
  onAddToShoppingList: (menuItemId: string) => void
  onToggleChecked: (menuItemId: string) => void
  onToggleExpanded: (menuItemId: string) => void
}

const toggleMenuItemInCache = (menu: MenuQueryData | undefined, menuItemId: string, updatedAt: string) => {
  if (!menu) {
    return menu
  }

  return {
    items: menu.items.map((item) => {
      if (item.id !== menuItemId) {
        return item
      }

      return {
        ...item,
        checked: !item.checked,
        checkedAt: item.checked ? null : updatedAt,
        updatedAt,
      }
    }),
  }
}

const mergeMenuItemInCache = (menu: MenuQueryData | undefined, updatedItem: MenuItem) => {
  if (!menu) {
    return menu
  }

  return {
    items: menu.items.map((item) => item.id === updatedItem.id ? updatedItem : item),
  }
}

const removeCheckedMenuItemsFromCache = (menu: MenuQueryData | undefined) => {
  if (!menu) {
    return menu
  }

  return {
    items: menu.items.filter((item) => !item.checked),
  }
}

const MenuRow = ({ isAddToShoppingListPending, isExpanded, item, isTogglePending, onAddToShoppingList, onToggleChecked, onToggleExpanded }: MenuRowProps) => {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/75">
      <div className="flex items-center gap-2 px-2.5 py-2.5 sm:gap-3 sm:px-3 sm:py-3">
        <Button aria-busy={isTogglePending || undefined} aria-label={t('menu.toggleItem')} className="shrink-0" disabled={isTogglePending} onClick={() => onToggleChecked(item.id)} size="icon-sm" type="button" variant="ghost">
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
          {item.recipe.notes && <RecipeNotes isExpanded value={item.recipe.notes} />}

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
  const queryClient = useQueryClient()
  const [expandedMenuItemId, setExpandedMenuItemId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const menuQuery = useQuery({
    queryFn: api.getMenu,
    queryKey: ['menu'],
  })

  const refreshMenuAndRecipes = () => {
    setPageError(null)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['menu'] }),
      queryClient.invalidateQueries({ queryKey: ['recipes'] }),
    ])
  }

  const refreshShoppingList = () => {
    setPageError(null)
    void queryClient.invalidateQueries({ queryKey: ['shopping-list'] })
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
    onError: (error, _menuItemId, context: ToggleMenuItemMutationContext | undefined) => {
      queryClient.setQueryData(['menu'], context?.previousMenu)
      handleMutationError(error)
    },
    onMutate: async (menuItemId) => {
      setPageError(null)
      await queryClient.cancelQueries({ queryKey: ['menu'] })
      const previousMenu = queryClient.getQueryData<MenuQueryData>(['menu'])

      queryClient.setQueryData<MenuQueryData>(['menu'], (currentMenu) => toggleMenuItemInCache(currentMenu, menuItemId, new Date().toISOString()))

      return { previousMenu } satisfies ToggleMenuItemMutationContext
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<MenuQueryData>(['menu'], (currentMenu) => mergeMenuItemInCache(currentMenu, updatedItem))
    },
  })
  const deleteCheckedMutation = useMutation({
    mutationKey: ['menu', 'delete-checked'],
    mutationFn: api.deleteCheckedMenuItems,
    onError: (error, _variables, context: DeleteCheckedMenuMutationContext | undefined) => {
      queryClient.setQueryData(['menu'], context?.previousMenu)
      setExpandedMenuItemId(context?.previousExpandedMenuItemId ?? null)
      handleMutationError(error)
    },
    onMutate: async () => {
      setPageError(null)
      await queryClient.cancelQueries({ queryKey: ['menu'] })

      const previousExpandedMenuItemId = expandedMenuItemId
      const previousMenu = queryClient.getQueryData<MenuQueryData>(['menu'])

      queryClient.setQueryData<MenuQueryData>(['menu'], (currentMenu) => removeCheckedMenuItemsFromCache(currentMenu))
      setExpandedMenuItemId((currentValue) => previousMenu?.items.some((item) => item.id === currentValue && item.checked) ? null : currentValue)

      return { previousExpandedMenuItemId, previousMenu } satisfies DeleteCheckedMenuMutationContext
    },
    onSuccess: () => {
      refreshMenuAndRecipes()
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

            <Button className="w-full sm:w-auto" disabled={checkedCount === 0 || deleteCheckedMutation.isPending} loading={deleteCheckedMutation.isPending} onClick={() => deleteCheckedMutation.mutate()} type="button" variant="outline">
              {t('menu.deleteChecked')}
            </Button>
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
