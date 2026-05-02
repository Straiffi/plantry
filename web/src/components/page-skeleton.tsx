import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'

type HeaderProps = {
  actionWidth?: string
  titleClassName?: string
  title?: string
}

type PlaceholderCardProps = {
  contentClassName?: string
  count: number
  lineClassNames?: string[]
}

const PageHeaderSkeleton = ({ actionWidth, title, titleClassName }: HeaderProps) => {
  return (
    <PageHeader actions={actionWidth ? <Skeleton className={`h-10 ${actionWidth}`} /> : undefined} title={title ?? ''} titleClassName={titleClassName} />
  )
}

const PlaceholderCard = ({ contentClassName = 'space-y-4 p-6', count, lineClassNames = [] }: PlaceholderCardProps) => {
  return (
    <Card>
      <CardContent className={contentClassName}>
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton className={lineClassNames[index] ?? 'h-16 w-full'} key={index} />
        ))}
      </CardContent>
    </Card>
  )
}

const ProductsSummaryCardSkeleton = () => {
  return (
    <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

type Props = {
  title?: string
  titleClassName?: string
}

export const ShoppingListPageSkeleton = ({ title, titleClassName }: Props) => {
  return (
    <div className="space-y-8" data-testid="shopping-list-page-skeleton">
      <PageHeaderSkeleton actionWidth="w-36" title={title} titleClassName={titleClassName} />
      <Card className="border-border/60 bg-card/90">
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-10 w-28" />
        </CardContent>
      </Card>
    </div>
  )
}

export const MenuPageSkeleton = ({ title, titleClassName }: Props) => {
  return (
    <div className="space-y-8" data-testid="menu-page-skeleton">
      <PageHeaderSkeleton actionWidth="w-72" title={title} titleClassName={titleClassName} />
      <Card className="border-border/60 bg-card/90">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  )
}

export const ProductsPageSkeleton = ({ title }: Props) => {
  return (
    <div className="space-y-8" data-testid="products-page-skeleton">
      <PageHeaderSkeleton actionWidth="w-40" title={title} />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-36" />
              </div>
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <ProductsSummaryCardSkeleton />
          <ProductsSummaryCardSkeleton />
        </div>
      </div>
    </div>
  )
}

export const RecipesPageSkeleton = ({ title }: Props) => {
  return (
    <div className="space-y-8" data-testid="recipes-page-skeleton">
      <PageHeaderSkeleton actionWidth="w-36" title={title} />
      <div className="space-y-6">
        <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-7 w-44" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/90 shadow-[0_16px_48px_rgba(62,44,32,0.06)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-7 w-36" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export const RecipeDetailPageSkeleton = () => {
  return (
    <div className="space-y-8" data-testid="recipe-detail-page-skeleton">
      <PageHeaderSkeleton actionWidth="w-36" />
      <PlaceholderCard
        contentClassName="space-y-4 p-6"
        count={6}
        lineClassNames={[
          'h-10 w-full',
          'h-24 w-full',
          'h-16 w-full rounded-2xl',
          'h-16 w-full rounded-2xl',
          'h-16 w-full rounded-2xl',
          'h-10 w-full sm:w-[34rem]',
        ]}
      />
    </div>
  )
}
