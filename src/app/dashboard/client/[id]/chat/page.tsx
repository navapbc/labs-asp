'use client'

import {
  AIResponseDisplay,
  BrowserView,
  ChatHeader,
  ChatInput,
  ChatMessage,
  TypingIndicator
} from '@/components'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { ScrollArea } from '@/components/ui/scroll-area'
import { experimental_useObject as useObject } from "@ai-sdk/react"
import { z } from 'zod'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  benefits: string[]
  status: 'active' | 'pending' | 'completed'
}

const mockClients: Record<string, Client> = {
  '1': {
    id: '1',
    name: 'Maria Rodriguez',
    email: 'maria.rodriguez@email.com',
    phone: '(951) 555-0123',
    benefits: ['CalFresh', 'Medi-Cal', 'WIC'],
    status: 'active'
  },
  '2': {
    id: '2',
    name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '(951) 555-0456',
    benefits: ['CalFresh', 'Housing Assistance'],
    status: 'pending'
  },
  '3': {
    id: '3',
    name: 'Ana Martinez',
    email: 'ana.martinez@email.com',
    phone: '(951) 555-0789',
    benefits: ['Medi-Cal', 'WIC'],
    status: 'completed'
  }
}

// Define the schema for AI responses
const aiResponseSchema = z.object({
  message: z.string().describe('Main response message'),
  action: z.string().optional().describe('Current action being performed'),
  status: z.string().optional().describe('Current status of the operation'),
  progress: z.number().optional().describe('Progress percentage (0-100)'),
  details: z.string().optional().describe('Additional details or context'),
  url: z.string().optional().describe('Current website URL'),
  screenshot: z.string().optional().describe('Screenshot filename if taken'),
  error: z.string().optional().describe('Error message if something went wrong'),
  nextStep: z.string().optional().describe('Next step to take'),
  completed: z.boolean().optional().describe('Whether the task is completed'),
})

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const client = mockClients[clientId]
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([
    {
      role: 'assistant',
      content: `You are the Web Automation Agent for Riverside County Benefits Portal. You're helping ${client?.name || 'the client'} with their benefits applications. You can navigate websites, research information, and help fill out forms for programs like CalFresh, Medi-Cal, WIC, and Housing Assistance. Be helpful, professional, and take action to assist with their specific needs.`,
      timestamp: new Date()
    }
  ])

  const { object, submit, isLoading } = useObject({
    api: '/api/chat-object',
    schema: aiResponseSchema,
    onFinish: (event) => {
      setIsTyping(false)
      // Add the AI response to chat history
      if (event.object) {
        const responseContent = event.object.message || 'Response received from agent'
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date()
        }])
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
      setIsTyping(false)
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, object])

  useEffect(() => {
    if (isLoading) {
      setIsTyping(true)
    }
  }, [isLoading])

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-4">Client not found</h2>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const handleSubmit = (message: string) => {
    if (message.trim()) {
      // Add user message to chat history
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, userMessage])
      
      // Submit to AI using useObject
      submit({ input: message })
    }
  }

  const handleBack = () => {
    router.push(`/dashboard/client/${clientId}`)
  }

  // Calculate progress based on AI response object
  const progress = object?.progress || 0

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Chat */}
        <div className="w-2/5 flex flex-col border-r bg-background">
          <ChatHeader 
            title="Applying for WIC"
            progress={progress}
            onBack={handleBack}
          />
          
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Chat messages */}
              {chatHistory.slice(1).map((message, index) => (
                <ChatMessage key={index} message={message} />
              ))}
              
              {/* AI Response Objects */}
              {object && <AIResponseDisplay object={object} />}
              
              {/* Typing indicator */}
              {isTyping && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <ChatInput 
            onSubmit={handleSubmit}
            disabled={isLoading}
            placeholder="Type a message..."
          />
        </div>

        {/* Right Side - Browser View */}
        <div className="w-3/5">
          <BrowserView url={object?.url || "https://wic-application.example.com"} />
        </div>
      </div>
    </div>
  )
}
