import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft } from 'lucide-react'
import {
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerContent,
  FamilyDrawerDescription,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerTitle,
  useFamilyDrawer,
} from '@/components/ui/family-drawer'
import { cn } from '@/lib/utils'

/**
 * Hoja inferior flotante basada en el Family Drawer de Cult UI. Soporta varias
 * "vistas" (ej. detalle → calificar) que se animan cambiando de altura.
 */
export function Sheet({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <FamilyDrawerRoot open={open} onOpenChange={onOpenChange}>
      <FamilyDrawerPortal>
        <FamilyDrawerOverlay className="bg-black/70" />
        <FamilyDrawerContent className="inset-x-3 bottom-3 max-w-[440px] rounded-[24px] border border-line bg-surface">
          <FamilyDrawerAnimatedWrapper className="no-scrollbar max-h-[86dvh] overflow-y-auto px-5 pt-3 pb-5">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-surface-3" />
            <ResetOnClose />
            <AnimatedViews>{children}</AnimatedViews>
          </FamilyDrawerAnimatedWrapper>
        </FamilyDrawerContent>
      </FamilyDrawerPortal>
    </FamilyDrawerRoot>
  )
}

/**
 * Transición entre vistas. Reemplaza a FamilyDrawerAnimatedContent: su modo
 * `popLayout` dejaba copias invisibles ocupando espacio al volver a una vista.
 */
function AnimatedViews({ children }: { children: ReactNode }) {
  const { view } = useFamilyDrawer()
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15, ease: [0.26, 0.08, 0.25, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function ResetOnClose() {
  const { isOpen, setView } = useFamilyDrawer()
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => setView('default'), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen, setView])
  return null
}

export function useSheetView() {
  const { view, setView } = useFamilyDrawer()
  return [view, setView] as const
}

export function SheetHeader({
  title,
  description,
  onBack,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  onBack?: () => void
  className?: string
}) {
  return (
    <header className={cn('mb-4', className)}>
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            type="button"
            data-vaul-no-drag=""
            onClick={onBack}
            aria-label="Volver"
            className="-ml-1 flex size-8 items-center justify-center rounded-lg border border-line text-dim active:scale-90"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        <FamilyDrawerTitle className="heading text-[1.45rem] leading-tight">{title}</FamilyDrawerTitle>
      </div>
      {description ? (
        <FamilyDrawerDescription className="mt-1.5 text-sm leading-snug font-normal text-dim">{description}</FamilyDrawerDescription>
      ) : (
        <FamilyDrawerDescription className="sr-only">{typeof title === 'string' ? title : ''}</FamilyDrawerDescription>
      )}
    </header>
  )
}
