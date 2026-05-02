import { useState } from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Save, Send, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { RecipeItemEditor, type RecipeDraftItem } from '@/components/recipe-item-editor'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const createDraftItem = (): RecipeDraftItem => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
})

export const RecipeDetailPage = () => {
  const { t } = useTranslation()
  const { recipeId } = useParams({ from: '/recipes/$recipeId' })
  const recipeQuery = useQuery({
    queryFn: () => api.getRecipe(recipeId),
    queryKey: ['recipe', recipeId],
  })

  if (recipeQuery.isPending) {
    return null
  }

  if (!recipeQuery.data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">{t('recipes.emptyDetail')}</CardContent>
      </Card>
    )
  }

  return <RecipeDetailEditor key={recipeQuery.data.updatedAt} recipe={recipeQuery.data} />
}

type RecipeDetailEditorProps = {
  recipe: Awaited<ReturnType<typeof api.getRecipe>>
}

const RecipeDetailEditor = ({ recipe }: RecipeDetailEditorProps) => {
  const { t } = useTranslation()
  const { recipeId } = useParams({ from: '/recipes/$recipeId' })
  const queryClient = useQueryClient()
  const [name, setName] = useState(recipe.name)
  const [notes, setNotes] = useState(recipe.notes ?? '')
  const [items, setItems] = useState<RecipeDraftItem[]>(() => recipe.items.map((item) => ({
    id: item.id,
    itemId: item.itemId,
    name: item.item.name,
    quantity: item.quantity,
  })))
  const [pageError, setPageError] = useState<string | null>(null)

  const refreshRecipes = async () => {
    setPageError(null)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recipes'] }),
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] }),
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

  const updateRecipeMutation = useMutation({
    mutationFn: () => api.updateRecipe(recipeId, {
      items: items.filter((item) => item.name.trim()).map((item, index) => ({
        itemId: item.itemId,
        name: item.itemId ? undefined : item.name,
        quantity: item.quantity,
        sortOrder: index,
      })),
      name,
      notes,
    }),
    onSuccess: refreshRecipes,
  })
  const addToShoppingListMutation = useMutation({
    mutationFn: () => api.addRecipeToShoppingList(recipeId),
    onSuccess: refreshRecipes,
  })
  const deleteRecipeMutation = useMutation({
    mutationFn: () => api.deleteRecipe(recipeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recipes'] }),
        queryClient.invalidateQueries({ queryKey: ['shopping-list'] }),
      ])
      window.location.assign('/recipes')
    },
  })

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button asChild variant="outline">
            <Link to="/recipes">{t('recipes.backToRecipes')}</Link>
          </Button>
        }
        description={t('recipes.detailDescription')}
        title={recipe.name}
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <Input onChange={(event) => setName(event.target.value)} placeholder={t('recipes.namePlaceholder')} value={name} />
          <Textarea onChange={(event) => setNotes(event.target.value)} placeholder={t('recipes.notesPlaceholder')} value={notes} />
          <div className="space-y-3">
            {items.map((item) => (
              <RecipeItemEditor
                item={item}
                key={item.id}
                onChange={(nextItem) => setItems((currentItems) => currentItems.map((currentItem) => currentItem.id === item.id ? nextItem : currentItem))}
                onRemove={() => setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id))}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setItems((currentItems) => [...currentItems, createDraftItem()])} type="button" variant="outline">
              <Plus className="size-4" />
              <span>{t('recipes.addItemRow')}</span>
            </Button>
            <Button onClick={() => updateRecipeMutation.mutate(undefined, { onError: handleMutationError })} type="button">
              <Save className="size-4" />
              <span>{t('recipes.saveRecipe')}</span>
            </Button>
            <Button onClick={() => addToShoppingListMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="secondary">
              <Send className="size-4" />
              <span>{t('recipes.addToShoppingList')}</span>
            </Button>
            <Button onClick={() => deleteRecipeMutation.mutate(undefined, { onError: handleMutationError })} type="button" variant="ghost">
              <Trash2 className="size-4" />
              <span>{t('recipes.deleteRecipe')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
