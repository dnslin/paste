'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }
  return context
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
}

export function ChartContainer({
  config,
  children,
  className,
  ...props
}: ChartContainerProps) {
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {}
    Object.entries(config).forEach(([key, value]) => {
      if (value.color) {
        vars[`--color-${key}`] = value.color
      }
    })
    return vars
  }, [config])

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        className={cn(
          'flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-(--text-secondary) [&_.recharts-cartesian-grid_line]:stroke-(--border-subtle) [&_.recharts-curve.recharts-tooltip-cursor]:stroke-(--border-default) [&_.recharts-polar-grid_[stroke]]:stroke-(--border-subtle) [&_.recharts-radial-bar-background-sector]:fill-(--bg-elevated) [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-(--bg-elevated) [&_.recharts-reference-line_[stroke]]:stroke-(--border-default)',
          className
        )}
        style={cssVars}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
}

interface ChartTooltipProps {
  content?: React.ReactNode
  cursor?: boolean
  hideLabel?: boolean
}

export function ChartTooltip({ content, cursor = true }: ChartTooltipProps) {
  return null
}

interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    dataKey: string
    color?: string
    payload?: Record<string, unknown>
  }>
  label?: string
  labelFormatter?: (label: string) => React.ReactNode
  valueFormatter?: (value: number) => React.ReactNode
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: 'line' | 'dot' | 'dashed'
  nameKey?: string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
  hideLabel = false,
  hideIndicator = false,
  indicator = 'dot',
  className,
  nameKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        'grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-(--border-subtle) bg-(--bg-surface) px-2.5 py-1.5 text-xs shadow-xl',
        className
      )}
    >
      {!hideLabel && label && (
        <div className="font-medium text-(--text-primary)">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = nameKey || item.dataKey || item.name
          const itemConfig = config[key] || {}
          const indicatorColor = item.color || itemConfig.color || `var(--chart-${index + 1})`

          return (
            <div
              key={item.dataKey || index}
              className="flex w-full items-center gap-2"
            >
              {!hideIndicator && (
                <div
                  className={cn(
                    'shrink-0 rounded-[2px]',
                    indicator === 'dot' && 'h-2.5 w-2.5',
                    indicator === 'line' && 'h-0.5 w-4',
                    indicator === 'dashed' && 'h-0.5 w-4 border-b border-dashed'
                  )}
                  style={{
                    backgroundColor: indicator !== 'dashed' ? indicatorColor : undefined,
                    borderColor: indicator === 'dashed' ? indicatorColor : undefined,
                  }}
                />
              )}
              <div className="flex flex-1 justify-between items-center gap-2">
                <span className="text-(--text-secondary)">
                  {itemConfig.label || key}
                </span>
                <span className="font-mono font-medium text-(--text-primary)">
                  {valueFormatter ? valueFormatter(item.value) : item.value}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface ChartLegendProps {
  payload?: Array<{
    value: string
    type?: string
    id?: string
    color?: string
    dataKey?: string
  }>
}

export function ChartLegend({ payload }: ChartLegendProps) {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
      {payload.map((entry, index) => {
        const key = entry.dataKey || entry.value
        const itemConfig = config[key] || {}
        const color = entry.color || itemConfig.color || `var(--chart-${index + 1})`

        return (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-(--text-secondary)">
              {itemConfig.label || key}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export { useChart }
