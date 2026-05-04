type Props = {
  isExpanded: boolean
  value: string
}

const recipeNoteUrlPattern = /(https?:\/\/[^\s]+)/g

export const RecipeNotes = ({ isExpanded, value }: Props) => {
  const parts = value.split(recipeNoteUrlPattern)

  return (
    <p className={`whitespace-pre-line break-words text-sm text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
      {parts.map((part, index) => {
        if (!part) {
          return null
        }

        if (/^https?:\/\/\S+$/.test(part)) {
          return (
            <a
              className="text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
              href={part}
              key={`${part}-${index}`}
              onClick={(event) => event.stopPropagation()}
              rel="noopener noreferrer"
              target="_blank"
            >
              {part}
            </a>
          )
        }

        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </p>
  )
}
