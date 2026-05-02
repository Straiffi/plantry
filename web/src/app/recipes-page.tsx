import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type Recipe } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { RecipeItemEditor, type RecipeDraftItem } from '@/components/recipe-item-editor'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const createDraftItem = (): RecipeDraftItem => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
})

type RecipeSummaryCardProps = {
  onAddToList: (recipeId: string) => void
  onDelete: (recipeId: string) => void
  recipe: Recipe
}

const RecipeSummaryCard = ({ onAddToList, onDelete, recipe }: RecipeSummaryCardProps) => {
  const { t } = useTranslation()

  return (
    <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-xl">{recipe.name}</CardTitle>
            <CardDescription>{recipe.notes ?? t('recipes.noNotes')}</CardDescription>
          </div>
          <Badge variant="outline">{t('recipes.itemCount', { count: recipe.items.length })}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {recipe.items.map((item) => (
            <Badge key={item.id} variant="muted">
              {item.quantity} x {item.item.name}
            </Badge>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }}>{t('recipes.openRecipe')}</Link>
          </Button>
          <Button onClick={() => onAddToList(recipe.id)} type="button">
            <Send className="size-4" />
            <span>{t('recipes.addToShoppingList')}</span>
          </Button>
          <Button onClick={() => onDelete(recipe.id)} type="button" variant="ghost">
            <Trash2 className="size-4" />
            <span>{t('recipes.deleteRecipe')}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const RecipesPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<RecipeDraftItem[]>([createDraftItem()])
  const [pageError, setPageError] = useState<string | null>(null)
  const recipesQuery = useQuery({
    queryFn: api.getRecipes,
    queryKey: ['recipes'],
  })

  const refreshRecipes = async () => {
    setPageError(null)
    await Promise.all([
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
    onSuccess: async () => {
      setName('')
      setNotes('')
      setItems([createDraftItem()])
      await refreshRecipes()
    },
  })
  const addRecipeToShoppingListMutation = useMutation({
    mutationFn: (recipeId: string) => api.addRecipeToShoppingList(recipeId),
    onSuccess: refreshRecipes,
  })
  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => api.deleteRecipe(recipeId),
    onSuccess: refreshRecipes,
  })

  if (recipesQuery.isPending) {
    return null
  }

  const recipes = recipesQuery.data ?? []

  return (
    <div className="space-y-8">
      <PageHeader description={t('recipes.description')} title={t('recipes.title')} />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('recipes.createTitle')}</CardTitle>
            <CardDescription>{t('recipes.createDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input onChange={(event) => setName(event.target.value)} placeholder={t('recipes.namePlaceholder')} value={name} />
            <Textarea onChange={(event) => setNotes(event.target.value)} placeholder={t('recipes.notesPlaceholder')} value={notes} />
            <div className="space-y-3">
              {items.map((item) => (
                <RecipeItemEditor
                  item={item}
                  key={item.id}
                  onChange={(nextItem) => setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id ? nextItem : currentItem))}
                  onRemove={() => setItems((currentItems) => currentItems.length === 1 ? currentItems : currentItems.filter((currentItem) => currentItem.id !== item.id))}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setItems((currentItems) => [...currentItems, createDraftItem()])} type="button" variant="outline">
                <Plus className="size-4" />
                <span>{t('recipes.addItemRow')}</span>
              </Button>
              <Button disabled={createRecipeMutation.isPending} onClick={() => createRecipeMutation.mutate(undefined, { onError: handleMutationError })} type="button">
                {t('recipes.createRecipe')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {recipes.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">{t('recipes.empty')}</CardContent>
            </Card>
          )}
          {recipes.map((recipe) => (
            <RecipeSummaryCard
              key={recipe.id}
              onAddToList={(recipeId) => addRecipeToShoppingListMutation.mutate(recipeId, { onError: handleMutationError })}
              onDelete={(recipeId) => deleteRecipeMutation.mutate(recipeId, { onError: handleMutationError })}
              recipe={recipe}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
