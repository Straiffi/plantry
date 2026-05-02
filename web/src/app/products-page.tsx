import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, defaultAnimateLayoutChanges, useSortable, verticalListSortingStrategy, type AnimateLayoutChanges } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, GripVertical, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type Category, type Product } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CategoryRowProps = {
  category: Category
  isDragging?: boolean
  onDelete: (categoryId: string) => void
}

const applyCategorySortOrder = (categories: Category[]) => {
  return categories.map((category, index) => ({
    ...category,
    sortOrder: index + 1,
  }))
}

type ProductCardProps = {
  categories: Category[]
  onArchive: (itemId: string) => void
  onCategoryChange: (itemId: string, categoryId: string | null) => void
  onRestore: (itemId: string) => void
  product: Product
}

const ProductCard = ({ categories, onArchive, onCategoryChange, onRestore, product }: ProductCardProps) => {
  const { t } = useTranslation()

  return (
    <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              {product.archivedAt && <Badge variant="muted">{t('products.archivedBadge')}</Badge>}
            </div>
            <CardDescription>
              {product.category?.name ?? t('products.uncategorized')}
            </CardDescription>
          </div>

          <Button onClick={() => (product.archivedAt ? onRestore(product.id) : onArchive(product.id))} variant="outline">
            {product.archivedAt ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}
            <span>{product.archivedAt ? t('products.restore') : t('products.archive')}</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{t('products.categoryLabel')}</p>
          <Select onValueChange={(value) => onCategoryChange(product.id, value === 'uncategorized' ? null : value)} value={product.categoryId ?? 'uncategorized'}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('products.uncategorized')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uncategorized">{t('products.uncategorized')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

const CategoryRowContent = ({ category, isDragging = false, onDelete }: CategoryRowProps) => {
  const { t } = useTranslation()

  return (
    <div className={`flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3 ${isDragging ? 'ring-1 ring-primary/20' : ''}`}>
      <div>
        <div className="flex items-center gap-2">
          <GripVertical className="size-4 text-muted-foreground" />
          <p className="font-medium text-foreground">{category.name}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t('products.sortOrderLabel', { value: category.sortOrder })}</p>
      </div>
      <Button onClick={() => onDelete(category.id)} type="button" variant="ghost">
        <Trash2 className="size-4" />
        <span>{t('products.deleteCategory')}</span>
      </Button>
    </div>
  )
}

const animateCategoryLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.isSorting) {
    return defaultAnimateLayoutChanges(args)
  }

  return false
}

const SortableCategoryRow = ({ category, onDelete }: CategoryRowProps) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    animateLayoutChanges: animateCategoryLayoutChanges,
    id: category.id,
  })

  return (
    <div
      className={isDragging ? 'opacity-0' : undefined}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <CategoryRowContent category={category} isDragging={isDragging} onDelete={onDelete} />
    </div>
  )
}

export const ProductsPage = () => {
  const { t } = useTranslation()
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const [categoryName, setCategoryName] = useState('')
  const [productCategoryId, setProductCategoryId] = useState<string>('')
  const [productName, setProductName] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const categoriesQuery = useQuery({
    queryFn: api.getCategories,
    queryKey: ['categories'],
  })
  const productsQuery = useQuery({
    queryFn: () => api.getProducts(true),
    queryKey: ['products', 'all'],
  })

  const invalidateCatalog = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] }),
      queryClient.invalidateQueries({ queryKey: ['product-search'] }),
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] }),
    ])
  }

  const invalidateCategoryDependents = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['products', 'all'] }),
      queryClient.invalidateQueries({ queryKey: ['product-search'] }),
      queryClient.invalidateQueries({ queryKey: ['shopping-list'] }),
    ])
  }

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => api.createCategory(name),
    onSuccess: async () => {
      setCategoryName('')
      setPageError(null)
      await invalidateCatalog()
    },
  })
  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => api.deleteCategory(categoryId),
    onSuccess: invalidateCatalog,
  })
  const reorderCategoriesMutation = useMutation<Category[], unknown, Category[], { previousCategories?: Category[] }>({
    mutationFn: (nextCategories: Category[]) => api.reorderCategories(nextCategories.map((category) => category.id)),
    onError: (_error, _nextCategories, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories'], context.previousCategories)
      }
    },
    onMutate: async (nextCategories) => {
      const optimisticCategories = applyCategorySortOrder(nextCategories)
      await queryClient.cancelQueries({ queryKey: ['categories'] })

      const previousCategories = queryClient.getQueryData<Category[]>(['categories'])

      queryClient.setQueryData(['categories'], optimisticCategories)

      return { previousCategories }
    },
    onSuccess: async (categories) => {
      queryClient.setQueryData(['categories'], categories)
      await invalidateCategoryDependents()
    },
  })
  const createProductMutation = useMutation({
    mutationFn: () => api.createProduct({
      categoryId: productCategoryId ? productCategoryId : null,
      name: productName,
    }),
    onSuccess: async () => {
      setProductName('')
      setProductCategoryId('')
      setPageError(null)
      await invalidateCatalog()
    },
  })
  const archiveProductMutation = useMutation({
    mutationFn: (itemId: string) => api.archiveProduct(itemId),
    onSuccess: invalidateCatalog,
  })
  const restoreProductMutation = useMutation({
    mutationFn: (itemId: string) => api.restoreProduct(itemId),
    onSuccess: invalidateCatalog,
  })
  const updateProductMutation = useMutation({
    mutationFn: ({ categoryId, itemId }: { categoryId: string | null; itemId: string }) => api.updateProduct(itemId, { categoryId }),
    onSuccess: invalidateCatalog,
  })

  const handleMutationError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      setPageError(t('products.conflictError'))
      return
    }

    setPageError(t('products.genericError'))
  }

  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data ?? []
  const visibleProducts = products.filter((product) => (showArchived ? product.archivedAt !== null : product.archivedAt === null))
  const activeCategory = activeCategoryId
    ? categories.find((category) => category.id === activeCategoryId) ?? null
    : null
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 6,
    },
  }))

  const handleCategoryDelete = (categoryId: string) => {
    deleteCategoryMutation.mutate(categoryId, { onError: handleMutationError })
  }

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      requestAnimationFrame(() => {
        setActiveCategoryId(null)
      })

      return
    }

    const orderedCategoryIds = [...categories]
    const draggedIndex = orderedCategoryIds.findIndex((category) => category.id === active.id)
    const targetIndex = orderedCategoryIds.findIndex((category) => category.id === over.id)

    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    const nextOrder = arrayMove(orderedCategoryIds, draggedIndex, targetIndex)
    reorderCategoriesMutation.mutate(nextOrder, { onError: handleMutationError })

    requestAnimationFrame(() => {
      setActiveCategoryId(null)
    })
  }

  if (categoriesQuery.isPending || productsQuery.isPending) {
    return null
  }

  return (
    <div className="space-y-8">
      <PageHeader
        actions={
          <Button onClick={() => setShowArchived((currentValue) => !currentValue)} variant="outline">
            {showArchived ? t('products.showActive') : t('products.showArchived')}
          </Button>
        }
        title={t('products.title')}
      />

      {pageError && (
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{pageError}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('products.categoriesTitle')}</CardTitle>
              <CardDescription>{t('products.categoriesDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input onChange={(event) => setCategoryName(event.target.value)} placeholder={t('products.categoryPlaceholder')} value={categoryName} />
                <Button
                  disabled={createCategoryMutation.isPending}
                  onClick={() => createCategoryMutation.mutate(categoryName, { onError: handleMutationError })}
                  type="button"
                >
                  {t('products.createCategory')}
                </Button>
              </div>

              <div className="space-y-3">
                {categories.length === 0 && <p className="text-sm text-muted-foreground">{t('products.noCategories')}</p>}
                {categories.length > 0 && (
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleCategoryDragEnd}
                    onDragStart={(event) => setActiveCategoryId(String(event.active.id))}
                    sensors={sensors}
                  >
                    <SortableContext items={categories.map((category) => category.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-3">
                        {categories.map((category) => (
                          <SortableCategoryRow category={category} key={category.id} onDelete={handleCategoryDelete} />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay dropAnimation={null}>
                      {activeCategory
                        ? <CategoryRowContent category={activeCategory} isDragging onDelete={handleCategoryDelete} />
                        : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('products.createTitle')}</CardTitle>
              <CardDescription>{t('products.createDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">{t('products.productLabel')}</Label>
                <Input id="product-name" onChange={(event) => setProductName(event.target.value)} placeholder={t('products.productPlaceholder')} value={productName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-category">{t('products.categoryLabel')}</Label>
                <Select onValueChange={setProductCategoryId} value={productCategoryId || 'uncategorized'}>
                  <SelectTrigger className="w-full" id="product-category">
                    <SelectValue placeholder={t('products.uncategorized')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">{t('products.uncategorized')}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={createProductMutation.isPending}
                onClick={() => createProductMutation.mutate(undefined, { onError: handleMutationError })}
                type="button"
              >
                {t('products.createProduct')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {visibleProducts.length === 0 && (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">{t('products.empty')}</CardContent>
            </Card>
          )}
          {visibleProducts.map((product) => (
            <ProductCard
              categories={categories}
              key={product.id}
              onArchive={(itemId) => archiveProductMutation.mutate(itemId, { onError: handleMutationError })}
              onCategoryChange={(itemId, categoryId) => updateProductMutation.mutate({ categoryId, itemId }, { onError: handleMutationError })}
              onRestore={(itemId) => restoreProductMutation.mutate(itemId, { onError: handleMutationError })}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
