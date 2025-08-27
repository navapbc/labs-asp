import { Avatar } from "@/components/ui/avatar"
import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex w-full items-start gap-4">
      <Avatar
        fallback="AI"
        size="md"
        className="shrink-0"
      >
        <Bot className="h-4 w-4" />
      </Avatar>
      
      <div className="flex w-full max-w-[80%] flex-col gap-2">
        <div className="flex w-fit items-center gap-2">
          <div className="rounded-2xl bg-muted px-4 py-2">
            <div className="flex space-x-1">
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0.1s' }}></div>
              <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
