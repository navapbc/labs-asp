import { Bot, User } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { memo } from "react"

export interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }
}

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn("flex w-full items-start gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar
          fallback="AI"
          size="md"
          className="shrink-0"
        >
          <Bot className="h-4 w-4" />
        </Avatar>
      )}
      
      <div className={cn(
        "flex w-full max-w-[80%] flex-col gap-2",
        isUser && "items-end"
      )}>
        <div className={cn(
          "flex w-fit items-center gap-2",
          isUser ? "justify-end" : "justify-start"
        )}>
          {isUser && (
            <Avatar
              fallback="U"
              size="md"
              className="shrink-0"
            >
              <User className="h-4 w-4" />
            </Avatar>
          )}
          
          <div className={cn(
            "rounded-2xl px-4 py-2 text-sm",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}>
            <div className="whitespace-pre-wrap leading-relaxed">
              {message.content}
            </div>
          </div>
        </div>
        
        <div className={cn(
          "text-xs text-muted-foreground",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  )
})
