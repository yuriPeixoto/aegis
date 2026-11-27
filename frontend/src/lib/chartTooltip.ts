// Props Recharts passes to a custom <Tooltip content={...} /> element.
export interface ChartTooltipEntry {
  dataKey?: string | number
  name?: string
  value?: string | number
  fill?: string
  stroke?: string
}

export interface ChartTooltipProps {
  active?: boolean
  payload?: ChartTooltipEntry[]
  label?: string | number
}
