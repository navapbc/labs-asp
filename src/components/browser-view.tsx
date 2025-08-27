import { cn } from "@/lib/utils"

interface BrowserViewProps {
  className?: string
  url?: string
  children?: React.ReactNode
}

export function BrowserView({ className, url = "https://wic-application.example.com", children }: BrowserViewProps) {
  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Browser Address Bar */}
      <div className="h-10 bg-muted border-b flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 bg-red-400 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
          <div className="w-3 h-3 bg-green-400 rounded-full"></div>
        </div>
        <div className="flex-1 bg-background rounded px-3 py-1.5 text-xs text-muted-foreground border">
          {url}
        </div>
      </div>
      
      {/* Browser Content */}
      <div className="flex-1 relative overflow-hidden">
        {children || (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <p className="text-sm font-medium">Browser View</p>
              <p className="text-xs">Website content will appear here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
