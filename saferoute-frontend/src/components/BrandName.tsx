import { cn } from '@/lib/utils'

type BrandNameProps = {
  className?: string
}

/** Renders “ALAITAPTAP” with the “AI” segment emphasized in pink. */
export function BrandName({ className }: BrandNameProps) {
  return (
    <span
      className={cn('font-display tracking-tight', className)}
      aria-label="ALAITAPTAP"
    >
      AL
      <span className="font-semibold text-pink-500 dark:text-pink-400">AI</span>
      TAPTAP
    </span>
  )
}
