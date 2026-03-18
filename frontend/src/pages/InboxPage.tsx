import { Inbox } from 'lucide-react'

export function InboxPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-40">
      <Inbox className="w-12 h-12 text-brand-purple" />
      <div>
        <p className="text-sm font-semibold text-slate-300">Unified Inbox</p>
        <p className="text-xs text-slate-500 font-mono mt-1">Coming in issue #8</p>
      </div>
    </div>
  )
}
