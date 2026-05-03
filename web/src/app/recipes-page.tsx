import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Plus, Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type Recipe } from '@/lib/api'
import { RecipesPageSkeleton } from '@/components/page-skeleton'
import { PageHeader } from '@/components/page-header'
import { RecipeItemEditor, type RecipeDraftItem } from '@/components/recipe-item-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const recipeDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

type SortValue = 'menu-date-asc' | 'menu-date-desc' | 'name-asc' | 'name-desc'

type RecipeSummaryCardProps = {
  isAddToMenuPending: boolean
  isAddToShoppingListPending: boolean
  isDeletePending: boolean
  isExpanded: boolean
  onAddToMenu: (recipeId: string) => void
  onAddToShoppingList: (recipeId: string) => void
  onDelete: (recipeId: string) => void
  onToggle: (recipeId: string) => void
  recipe: Recipe
}

const createDraftItem = (): RecipeDraftItem => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
})

const formatMenuDate = (value: string) => {
  return recipeDateFormatter.format(new Date(value))
}

const getRecipeSortLabel = (recipe: Recipe, t: ReturnType<typeof useTranslation>['t']) => {
  if (!recipe.lastAddedToMenuAt) {
    return t('recipes.lastAddedToMenuNever')
  }

  return t('recipes.lastAddedToMenu', { value: formatMenuDate(recipe.lastAddedToMenuAt) })
}

const compareNullableDates = (left: string | null, right: string | null, direction: 'asc' | 'desc') => {
  if (left === null && right === null) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  const leftTime = new Date(left).getTime()
  const rightTime = new Date(right).getTime()

  if (direction === 'asc') {
    return leftTime - rightTime
  }

  return rightTime - leftTime
}

const sortRecipes = (recipes: Recipe[], sortValue: SortValue) => {
  return [...recipes].sort((left, right) => {
    if (sortValue === 'name-asc') {
      return left.name.localeCompare(right.name)
    }

    if (sortValue === 'name-desc') {
      return right.name.localeCompare(left.name)
    }

    const menuDateComparison = compareNullableDates(left.lastAddedToMenuAt, right.lastAddedToMenuAt, sortValue === 'menu-date-asc' ? 'asc' : 'desc')

    if (menuDateComparison !== 0) {
      return menuDateComparison
    }

    return left.name.localeCompare(right.name)
  })
}

const normalizeRecipeSearchValue = (value: string) => {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

const matchesRecipeSearch = (recipe: Recipe, query: string) => {
  const normalizedQuery = normalizeRecipeSearchValue(query)

  if (!normalizedQuery) {
    return true
  }

  if (normalizeRecipeSearchValue(recipe.name).includes(normalizedQuery)) {
    return true
  }

  return recipe.items.some((item) => normalizeRecipeSearchValue(item.item.name).includes(normalizedQuery))
}

const RecipeSummaryCard = ({ isAddToMenuPending, isAddToShoppingListPending, isDeletePending, isExpanded, onAddToMenu, onAddToShoppingList, onDelete, onToggle, recipe }: RecipeSummaryCardProps) => {
  const { t } = useTranslation()
  const lastAddedLabel = getRecipeSortLabel(recipe, t)
  const previewText = recipe.notes ?? t('recipes.noNotes')

  return (
    <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
        <button
          aria-expanded={isExpanded}
          className="min-w-0 flex-1 rounded-3xl text-left outline-none transition-colors hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={() => onToggle(recipe.id)}
          type="button"
        >
          <div className="min-w-0 space-y-2">
            <p className="truncate text-lg font-semibold text-foreground">{recipe.name}</p>
            <p className="hidden line-clamp-1 text-sm text-muted-foreground sm:block">{previewText}</p>
            <p className="text-xs text-muted-foreground">{lastAddedLabel}</p>
          </div>
        </button>

        <div className="flex items-center justify-between gap-2 sm:shrink-0 sm:justify-start sm:gap-3">
          <div className="flex items-center gap-2 sm:order-2 sm:gap-3">
            <Badge variant="outline">{t('recipes.itemCount', { count: recipe.items.length })}</Badge>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
          <Button loading={isAddToMenuPending} onClick={() => onAddToMenu(recipe.id)} size="xs" type="button" variant="secondary">
            <span>{t('recipes.addToMenu')}</span>
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="space-y-4 border-t border-border/60 p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {recipe.items.map((item) => (
              <Badge key={item.id} variant="muted">
                {item.quantity} x {item.item.name}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link params={{ recipeId: recipe.id }} to="/recipes/$recipeId">{t('recipes.openRecipe')}</Link>
            </Button>
            <Button loading={isAddToShoppingListPending} onClick={() => onAddToShoppingList(recipe.id)} type="button">
              <Send className="size-4" />
              <span>{t('recipes.addToShoppingList')}</span>
            </Button>
            <Button loading={isDeletePending} onClick={() => onDelete(recipe.id)} type="button" variant="ghost">
              <Trash2 className="size-4" />
              <span>{t('recipes.deleteRecipe')}</span>
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export const RecipesPage = () => {
  const { t } = useTranslation()
  const [autoFocusItemId, setAutoFocusItemId] = useState<string | null>(null)
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [sortValue, setSortValue] = useState<SortValue>('name-asc')
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RecipeDraftItem[]>([createDraftItem()])
  const [pageError, setPageError] = useState<string | null>(null)
  const recipesQuery = useQuery({
    queryFn: api.getRecipes,
    queryKey: ['recipes'],
  })

  const refreshRecipes = () => {
    setPageError(null)
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['menu'] }),
      queryClient.invalidateQueries({ queryKey: ['products', 'active'] }),
      queryClient.invalidateQueries({ queryKey: ['recipes'] }),
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] }),
      queryClient.invalidateQueries({ queryKey: ['product-search'] }),
    ])
  }

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      setPageError(t('recipes.duplicateItemError'))
      return
    }

    setPageError(t('recipes.genericError'))
  }

  const createRecipeMutation = useMutation({
    mutationKey: ['recipes', 'create-recipe'],
    mutationFn: () => api.createRecipe({
      items: items.filter((item) => item.name.trim()).map((item, index) => ({
        itemId: item.itemId,
        name: item.itemId ? undefined : item.name,
        quantity: item.quantity,
        sortOrder: index,
      })),
      name,
      notes,
    }),
    onSuccess: () => {
      setAutoFocusItemId(null)
      setName('')
      setNotes('')
      setItems([createDraftItem()])
      setIsCreateFormOpen(false)
      refreshRecipes()
    },
  })
  const addRecipeToMenuMutation = useMutation({
    mutationKey: ['recipes', 'add-to-menu'],
    mutationFn: (recipeId: string) => api.addRecipeToMenu(recipeId),
    onSuccess: refreshRecipes,
  })
  const addRecipeToShoppingListMutation = useMutation({
    mutationKey: ['recipes', 'add-to-shopping-list'],
    mutationFn: (recipeId: string) => api.addRecipeToShoppingList(recipeId),
    onSuccess: refreshRecipes,
  })
  const deleteRecipeMutation = useMutation({
    mutationKey: ['recipes', 'delete-recipe'],
    mutationFn: (recipeId: string) => api.deleteRecipe(recipeId),
    onSuccess: () => {
      setExpandedRecipeId(null)
      refreshRecipes()
    },
  })

  const pendingAddToMenuRecipeIds = useMutationState({
    filters: { mutationKey: ['recipes', 'add-to-menu'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  const pendingAddToShoppingListRecipeIds = useMutationState({
    filters: { mutationKey: ['recipes', 'add-to-shopping-list'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })
  const pendingDeletedRecipeIds = useMutationState({
    filters: { mutationKey: ['recipes', 'delete-recipe'], status: 'pending' },
    select: (mutation) => mutation.state.variables as string,
  })

  const filteredRecipes = (recipesQuery.data ?? []).filter((recipe) => matchesRecipeSearch(recipe, searchValue))
  const recipes = sortRecipes(filteredRecipes, sortValue)
  const hasRecipes = (recipesQuery.data ?? []).length > 0
  const hasActiveSearch = normalizeRecipeSearchValue(searchValue).length > 0
  const visibleExpandedRecipeId = recipes.some((recipe) => recipe.id === expandedRecipeId) ? expandedRecipeId : null

  if (recipesQuery.isPending) {
    return <RecipesPageSkeleton title={t('recipes.title')} />
  }

  const handleRecipeItemChange = (itemId: string, nextItem: RecipeDraftItem) => {
    setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === itemId ? nextItem : currentItem))
  }

  const handleRecipeItemSelectionCommitted = (itemId: string, nextItem: RecipeDraftItem, isLastItem: boolean) => {
    const appendedItem = isLastItem ? createDraftItem() : null

    setItems((currentItems) => {
      const updatedItems = currentItems.map((currentItem) => currentItem.id === itemId ? nextItem : currentItem)

      if (!appendedItem) {
        return updatedItems
      }

      return [...updatedItems, appendedItem]
    })
    setAutoFocusItemId(appendedItem?.id ?? null)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={<Button onClick={() => setIsCreateFormOpen((currentValue) => !currentValue)} type="button" variant="outline">{isCreateFormOpen ? t('recipes.hideCreateForm') : t('recipes.addRecipe')}</Button>}
        title={t('recipes.title')}
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            aria-label={t('recipes.searchLabel')}
            className="sm:max-w-md"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder={t('recipes.searchPlaceholder')}
            value={searchValue}
          />
          <Select onValueChange={(value) => setSortValue(value as SortValue)} value={sortValue}>
            <SelectTrigger aria-label={t('recipes.sortBy')} className="min-w-52">
              <SelectValue placeholder={t('recipes.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">{t('recipes.sortNameAsc')}</SelectItem>
              <SelectItem value="name-desc">{t('recipes.sortNameDesc')}</SelectItem>
              <SelectItem value="menu-date-asc">{t('recipes.sortMenuDateAsc')}</SelectItem>
              <SelectItem value="menu-date-desc">{t('recipes.sortMenuDateDesc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isCreateFormOpen && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <Input onChange={(event) => setName(event.target.value)} placeholder={t('recipes.namePlaceholder')} value={name} />
              <Textarea onChange={(event) => setNotes(event.target.value)} placeholder={t('recipes.notesPlaceholder')} value={notes} />
              <div className="space-y-3">
                {items.map((item) => (
                  <RecipeItemEditor
                    autoFocus={item.id === autoFocusItemId}
                    item={item}
                    key={item.id}
                    onChange={(nextItem) => handleRecipeItemChange(item.id, nextItem)}
                    onRemove={() => setItems((currentItems) => currentItems.length === 1 ? currentItems : currentItems.filter((currentItem) => currentItem.id !== item.id))}
                    onSelectionCommitted={(nextItem) => handleRecipeItemSelectionCommitted(item.id, nextItem, item.id === items[items.length - 1]?.id)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setItems((currentItems) => [...currentItems, createDraftItem()])} type="button" variant="outline">
                  <Plus className="size-4" />
                  <span>{t('recipes.addItemRow')}</span>
                </Button>
                <Button loading={createRecipeMutation.isPending} onClick={() => createRecipeMutation.mutate(undefined, { onError: handleMutationError })} type="button">
                  {t('recipes.createRecipe')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasRecipes && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{t('recipes.empty')}</CardContent>
          </Card>
        )}

        {hasRecipes && recipes.length === 0 && hasActiveSearch && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">{t('recipes.emptySearch')}</CardContent>
          </Card>
        )}

        {recipes.map((recipe) => (
          <RecipeSummaryCard
            isAddToMenuPending={pendingAddToMenuRecipeIds.includes(recipe.id)}
            isAddToShoppingListPending={pendingAddToShoppingListRecipeIds.includes(recipe.id)}
            isDeletePending={pendingDeletedRecipeIds.includes(recipe.id)}
            isExpanded={visibleExpandedRecipeId === recipe.id}
            key={recipe.id}
            onAddToMenu={(recipeId) => addRecipeToMenuMutation.mutate(recipeId, { onError: handleMutationError })}
            onAddToShoppingList={(recipeId) => addRecipeToShoppingListMutation.mutate(recipeId, { onError: handleMutationError })}
            onDelete={(recipeId) => deleteRecipeMutation.mutate(recipeId, { onError: handleMutationError })}
            onToggle={(recipeId) => setExpandedRecipeId((currentValue) => currentValue === recipeId ? null : recipeId)}
            recipe={recipe}
          />
        ))}
      </div>
    </div>
  )
}
