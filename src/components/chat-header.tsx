import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ChatHeaderProps {
  title: string
  progress?: number
  onBack: () => void
}

export function ChatHeader({ title, progress = 0, onBack }: ChatHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="border-b rounded-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              ←
            </Button>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-3 pt-3 border-t">
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center space-x-1 list-none">
                <span>See activity</span>
                <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 pl-6 text-muted-foreground text-sm">
                <ul className="list-disc space-y-1">
                  <li>Started application for {title}</li>
                  <li>Uploaded proof of income</li>
                  <li>Completed household information</li>
                </ul>
              </div>
            </details>
          </div>
        )}
      </CardHeader>
    </Card>
  )
}
