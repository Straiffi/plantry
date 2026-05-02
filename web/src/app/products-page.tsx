import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, RotateCcw, Tags, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { api, ApiError, type Category, type Product } from '@/lib/api'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ProductCardProps = {
  categories: Category[]
  onArchive: (itemId: string) => void
  onDeleteTag: (itemId: string, tag: string) => void
  onRestore: (itemId: string) => void
  onTagSubmit: (itemId: string, tag: string) => void
  product: Product
}

const ProductCard = ({ categories, onArchive, onDeleteTag, onRestore, onTagSubmit, product }: ProductCardProps) => {
  const { t } = useTranslation()
  const [tagName, setTagName] = useState('')

  const handleTagSubmit = () => {
    if (!tagName.trim()) {
      return
    }

    onTagSubmit(product.id, tagName)
    setTagName('')
  }

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
        <div className="flex flex-wrap gap-2">
          {product.tags.length === 0 && <Badge variant="outline">{t('products.noTags')}</Badge>}
          {product.tags.map((tag) => (
            <Button
              className="h-7 gap-1 px-2.5"
              key={tag}
              onClick={() => onDeleteTag(product.id, tag)}
              size="xs"
              type="button"
              variant="outline"
            >
              <Tags className="size-3" />
              <span>{tag}</span>
            </Button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input onChange={(event) => setTagName(event.target.value)} placeholder={t('products.tagPlaceholder')} value={tagName} />
          <Button onClick={handleTagSubmit} type="button">{t('products.addTag')}</Button>
        </div>

        {categories.length > 0 && !product.category && (
          <p className="text-xs text-muted-foreground">{t('products.categoryHint')}</p>
        )}
      </CardContent>
    </Card>
  )
}

export const ProductsPage = () => {
  const { t } = useTranslation()
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
  const addTagMutation = useMutation({
    mutationFn: ({ itemId, tag }: { itemId: string; tag: string }) => api.addProductTag(itemId, tag),
    onSuccess: invalidateCatalog,
  })
  const deleteTagMutation = useMutation({
    mutationFn: ({ itemId, tag }: { itemId: string; tag: string }) => api.deleteProductTag(itemId, tag),
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
        description={t('products.description')}
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
                {categories.map((category) => (
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3" key={category.id}>
                    <div>
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{t('products.sortOrderLabel', { value: category.sortOrder })}</p>
                    </div>
                    <Button
                      onClick={() => deleteCategoryMutation.mutate(category.id, { onError: handleMutationError })}
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                      <span>{t('products.deleteCategory')}</span>
                    </Button>
                  </div>
                ))}
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
              onDeleteTag={(itemId, tag) => deleteTagMutation.mutate({ itemId, tag }, { onError: handleMutationError })}
              onRestore={(itemId) => restoreProductMutation.mutate(itemId, { onError: handleMutationError })}
              onTagSubmit={(itemId, tag) => addTagMutation.mutate({ itemId, tag }, { onError: handleMutationError })}
              product={product}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
