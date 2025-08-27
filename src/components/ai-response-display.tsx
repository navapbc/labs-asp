import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Info,
  Loader2,
  MapPin,
  MessageSquare,
  TrendingUp
} from "lucide-react"

import { cn } from "@/lib/utils"

interface AIResponseObject {
  message?: string
  action?: string
  status?: string
  progress?: number
  details?: string
  url?: string
  screenshot?: string
  error?: string
  nextStep?: string
  completed?: boolean
}

interface AIResponseDisplayProps {
  object: AIResponseObject
}

export function AIResponseDisplay({ object }: AIResponseDisplayProps) {
  const renderField = (key: keyof AIResponseObject, value: any, icon: React.ReactNode, bgColor: string, textColor: string, borderColor: string) => {
    if (value === undefined || value === null) return null
    
    return (
      <div key={key} className={cn(
        "rounded-lg p-3 mb-2 border-l-4",
        bgColor, textColor, borderColor
      )}>
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{icon}</div>
          <div className="flex-1 text-sm">
            {key === 'progress' ? (
              <div>
                <div className="font-medium mb-2">Progress: {value}%</div>
                <div className="w-full bg-current/20 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-current"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ) : key === 'url' ? (
              <div>
                <div className="font-medium mb-1">Current URL:</div>
                <div className="text-xs break-all font-mono bg-current/10 p-2 rounded">{value}</div>
              </div>
            ) : (
              <div className="font-medium">{value}</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const fields: Array<{
    key: keyof AIResponseObject
    icon: React.ReactNode
    bg: string
    text: string
    border: string
  }> = [
    { key: 'message', icon: <MessageSquare className="w-4 h-4" />, bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-500' },
    { key: 'action', icon: <Loader2 className="w-4 h-4" />, bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-500' },
    { key: 'status', icon: <Info className="w-4 h-4" />, bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-500' },
    { key: 'progress', icon: <TrendingUp className="w-4 h-4" />, bg: 'bg-purple-50', text: 'text-purple-900', border: 'border-purple-500' },
    { key: 'details', icon: <Info className="w-4 h-4" />, bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-500' },
    { key: 'url', icon: <Globe className="w-4 h-4" />, bg: 'bg-indigo-50', text: 'text-indigo-900', border: 'border-indigo-500' },
    { key: 'screenshot', icon: <MapPin className="w-4 h-4" />, bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-500' },
    { key: 'error', icon: <AlertTriangle className="w-4 h-4" />, bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-500' },
    { key: 'nextStep', icon: <Clock className="w-4 h-4" />, bg: 'bg-teal-50', text: 'text-teal-900', border: 'border-teal-500' },
    { key: 'completed', icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50', text: 'text-green-900', border: 'border-green-500' },
  ]

  return (
    <div className="space-y-2">
      {fields.map(({ key, icon, bg, text, border }) => {
        const value = object[key as keyof AIResponseObject]
        if (value === undefined || value === null) return null
        
        if (key === 'completed') {
          return renderField(
            key, 
            value ? 'Task completed successfully!' : 'Task in progress...', 
            value ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />,
            value ? 'bg-green-50' : 'bg-gray-50',
            value ? 'text-green-900' : 'text-gray-900',
            value ? 'border-green-500' : 'border-gray-500'
          )
        }
        
        return renderField(key, value, icon, bg, text, border)
      })}
    </div>
  )
}
