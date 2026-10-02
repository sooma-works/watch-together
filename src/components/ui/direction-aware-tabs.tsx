"use client"

import { type ReactNode, useMemo, useState } from "react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"
import useMeasure from "react-use-measure"

import { cn } from "@/lib/utils"

type Tab = {
  id: number
  label: ReactNode
  content: ReactNode
}

interface OgImageSectionProps {
  tabs: Tab[]
  className?: string
  /** Outer container radius (e.g. `rounded-lg`) */
  rounded?: string
  /** Inner tab/bubble radius — should be outer radius minus container padding (~3px) */
  roundedInner?: string
  onChange?: () => void
  /** Modo controlado (agregado en Watch 2gder). */
  value?: number
  onValueChange?: (id: number) => void
  /** Clases del indicador activo. */
  bubbleClassName?: string
}

function DirectionAwareTabs({
  tabs,
  className,
  rounded,
  roundedInner,
  onChange,
  value,
  onValueChange,
  bubbleClassName,
}: OgImageSectionProps) {
  const [internalTab, setInternalTab] = useState(value ?? 0)
  const activeTab = value ?? internalTab
  const setActiveTab = (id: number) => {
    setInternalTab(id)
    onValueChange?.(id)
  }
  const [direction, setDirection] = useState(0)
  const [ref, bounds] = useMeasure()

  const content = useMemo(() => {
    const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content
    return activeTabContent || null
  }, [activeTab, tabs])

  const handleTabClick = (newTabId: number) => {
    // Sin la guarda de `isAnimating` original: quedaba trabada en true cuando
    // el contenido tiene sus propias animaciones y bloqueaba el cambio de tab.
    if (newTabId !== activeTab) {
      const newDirection = newTabId > activeTab ? 1 : -1
      setDirection(newDirection)
      setActiveTab(newTabId)
      onChange ? onChange() : null
    }
  }

  const variants = {
    initial: (direction: number) => ({
      x: 300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
    active: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (direction: number) => ({
      x: -300 * direction,
      opacity: 0,
      filter: "blur(4px)",
    }),
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div
        className={cn(
          "flex cursor-pointer space-x-1 rounded-full border border-line bg-surface px-[3px] py-[3.2px]",
          className,
          rounded
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 font-mono text-[11px] tracking-wider uppercase transition focus-visible:ring-1 focus-visible:outline-1 focus-visible:outline-none",
              activeTab === tab.id
                ? "text-bg"
                : "text-dim hover:text-fg",
              rounded ? roundedInner : undefined
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="bubble"
                className={cn(
                  "absolute inset-0 z-10 bg-fg",
                  rounded ? roundedInner : "rounded-full",
                  bubbleClassName
                )}
                transition={{ type: "spring", bounce: 0.19, duration: 0.4 }}
              />
            )}

            <span className="relative z-20 flex items-center gap-1.5">{tab.label}</span>
          </button>
        ))}
      </div>
      <MotionConfig transition={{ duration: 0.4, type: "spring", bounce: 0.2 }}>
        <motion.div
          className="relative mx-auto h-full w-full overflow-hidden"
          initial={false}
          animate={{ height: bounds.height }}
        >
          <div className="p-1" ref={ref}>
            <AnimatePresence
              custom={direction}
              mode="popLayout"
            >
              <motion.div
                key={activeTab}
                variants={variants}
                initial="initial"
                animate="active"
                exit="exit"
                custom={direction}
              >
                {content}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  )
}
export { DirectionAwareTabs }
