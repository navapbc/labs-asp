'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useChat } from '@ai-sdk/react'

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

export default function ChatPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const client = mockClients[clientId]
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: '1',
        role: 'system',
        content: `You are the Web Automation Agent for Riverside County Benefits Portal. You're helping ${client?.name} with their benefits applications. You can navigate websites, research information, and help fill out forms for programs like CalFresh, Medi-Cal, WIC, and Housing Assistance. Be helpful, professional, and take action to assist with their specific needs.`
      }
    ],
    onFinish: () => {
      setIsTyping(false)
    },
    onError: (error) => {
      console.error('Chat error:', error)
      setIsTyping(false)
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isLoading) {
      setIsTyping(true)
    }
  }, [isLoading])

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-8">
            <p className="text-gray-600">Client not found</p>
            <Button onClick={() => router.push('/dashboard')} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      handleSubmit(e)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => router.push(`/dashboard/client/${clientId}`)}
                className="flex items-center space-x-2"
              >
                ← Back to Client
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">AI Assistant Chat</h1>
                <p className="text-gray-600">Helping {client.name} with benefits applications</p>
              </div>
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Chat and Website */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Chat */}
        <div className="w-2/5 border-r border-gray-200 bg-white">
          <Card className="h-full border-0 rounded-none">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="flex items-center space-x-2">
                <span className="font-bold text-lg">{client.name}</span>
              </CardTitle>
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-2">
                  Application Progress
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${client.applicationProgress ?? 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {client.applicationProgress ?? 0}% complete
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.slice(1).map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <div className="border-t p-4 bg-white sticky bottom-0 left-0 right-0 z-10">
                <form onSubmit={handleFormSubmit} className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask me to help with benefits applications, research programs, or navigate websites..."
                      className="w-full min-h-[80px] p-3 pr-20 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="absolute bottom-2 right-2 px-4 py-1 h-auto min-h-0"
                      tabIndex={0}
                    >
                      {isLoading ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <div className="text-xs text-gray-500">
                      {input.length} characters
                    </div>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side - WIC Website */}
        <div className="w-3/5 bg-white">
          <div className="h-full flex flex-col">
            <div className="border-b bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">WIC Riverside County Website</h2>
              <p className="text-sm text-gray-600">Live view of the WIC application process</p>
            </div>
            <div className="flex-1">
              <iframe
                src="https://www.ruhealth.org/appointments/apply-4-wic-form"
                title="WIC Riverside County Website"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
