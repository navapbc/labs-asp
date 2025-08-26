'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [input, setInput] = useState('')
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
      // Add user message to chat history
      const userMessage = {
        role: 'user' as const,
        content: input,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, userMessage])
      
      // Submit to AI using useObject
      submit({ input: input })
      
      // Clear input
      setInput('')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  // Function to render AI response object
  const renderAIResponseObject = () => {
    if (!object) return null

    const baseClasses = "rounded-lg p-3 mb-2"
    
    const objects = []
    
    if (object.message) {
      objects.push(
        <div key="message" className={`${baseClasses} bg-gray-100 text-black`}>
          <div className="text-sm">{object.message}</div>
        </div>
      )
    }
    
    if (object.action) {
      objects.push(
        <div key="action" className={`${baseClasses} bg-blue-100 text-blue-900 border-l-4 border-blue-500`}>
          <div className="text-sm font-medium">🔄 {object.action}</div>
        </div>
      )
    }
    
    if (object.status) {
      objects.push(
        <div key="status" className={`${baseClasses} bg-green-100 text-green-900 border-l-4 border-green-500`}>
          <div className="text-sm font-medium">📊 {object.status}</div>
        </div>
      )
    }
    
    if (object.progress !== undefined) {
      objects.push(
        <div key="progress" className={`${baseClasses} bg-purple-100 text-purple-900 border-l-4 border-purple-500`}>
          <div className="text-sm font-medium">📈 Progress: {object.progress}%</div>
          <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${object.progress}%` }}
            ></div>
          </div>
        </div>
      )
    }
    
    if (object.details) {
      objects.push(
        <div key="details" className={`${baseClasses} bg-yellow-100 text-yellow-900 border-l-4 border-yellow-500`}>
          <div className="text-sm">💡 {object.details}</div>
        </div>
      )
    }
    
    if (object.url) {
      objects.push(
        <div key="url" className={`${baseClasses} bg-indigo-100 text-indigo-900 border-l-4 border-indigo-500`}>
          <div className="text-sm font-medium">🌐 Current URL:</div>
          <div className="text-xs break-all">{object.url}</div>
        </div>
      )
    }
    
    if (object.screenshot) {
      objects.push(
        <div key="screenshot" className={`${baseClasses} bg-orange-100 text-orange-900 border-l-4 border-orange-500`}>
          <div className="text-sm">📸 Screenshot captured: {object.screenshot}</div>
        </div>
      )
    }
    
    if (object.error) {
      objects.push(
        <div key="error" className={`${baseClasses} bg-red-100 text-red-900 border-l-4 border-red-500`}>
          <div className="text-sm font-medium">⚠️ Error: {object.error}</div>
        </div>
      )
    }
    
    if (object.nextStep) {
      objects.push(
        <div key="nextStep" className={`${baseClasses} bg-teal-100 text-teal-900 border-l-4 border-teal-500`}>
          <div className="text-sm font-medium">➡️ Next Step:</div>
          <div className="text-sm">{object.nextStep}</div>
        </div>
      )
    }
    
    if (object.completed !== undefined) {
      objects.push(
        <div key="completed" className={`${baseClasses} ${object.completed ? 'bg-green-100 text-green-900 border-l-4 border-green-500' : 'bg-gray-100 text-gray-900'}`}>
          <div className="text-sm font-medium">
            {object.completed ? '✅ ' : '⏳ '}{object.completed ? 'Task completed successfully!' : 'Task in progress...'}
          </div>
        </div>
      )
    }
    
    return objects
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
                <h1 className="text-2xl font-bold text-gray-900">Agentic Submission Tool</h1>
                <p className="text-gray-600">Helping {client.name} with benefits applications</p>
              </div>
            </div>
            <Button onClick={() => router.push('/')} variant="outline">
              Log out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Chat and Website */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Chat */}
        <div className="w-2/5 border-r border-gray-200 bg-white flex flex-col overflow-hidden">
          <Card className="h-full border-0 rounded-none flex flex-col">
            <CardHeader className="border-b bg-white flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <span className="font-bold text-lg text-black">Applying for WIC</span>
                <span className="text-sm text-gray-600">0%</span>
              </CardTitle>
              <div className="mt-2">
                <details className="group">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1 list-none">
                    <span>See activity</span>
                    <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-2 pl-6 text-gray-700 text-sm">
                    {/* Example activity content. Replace with real activity as needed. */}
                    <ul className="list-disc space-y-1">
                      <li>Started application for WIC</li>
                      <li>Uploaded proof of income</li>
                      <li>Completed household information</li>
                    </ul>
                  </div>
                </details>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {/* Chat messages */}
                {chatHistory.slice(1).map((message, index) => (
                  <div
                    key={index}
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
                
                {/* AI Response Objects */}
                {renderAIResponseObject()}
                
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
            </CardContent>
          </Card>

          {/* Input Form - Fixed to bottom */}
          <div className="border-t p-4 bg-white flex-shrink-0">
            <form onSubmit={handleFormSubmit} className="space-y-2">
              <div className="relative">
                <textarea
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Write something..."
                  className="w-full min-h-[80px] p-3 pr-20 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={isLoading}
                />
                <div className="absolute bottom-2 right-2 flex space-x-2">
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800"
                    aria-label="Pause/Resume"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                  </button>
                  <Button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="w-8 h-8 p-0 h-auto min-h-0"
                    tabIndex={0}
                    aria-label="Send message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Browser View */}
        <div className="w-3/5 bg-purple-100 relative">
          {/* Browser Address Bar */}
          <div className="h-8 bg-gray-200 border-b border-gray-300 flex items-center px-3">
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
            <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
            <div className="flex-1 bg-white rounded px-2 py-1 text-xs text-gray-600">
              https://wic-application.example.com
            </div>
          </div>
          
          {/* Pattern Background */}
          <div className="flex-1 relative">
            <div className="absolute inset-0 opacity-20">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="wave" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M0 10 Q5 5 10 10 T20 10" stroke="purple" strokeWidth="0.5" fill="none"/>
                    <path d="M0 20 Q5 15 10 20 T20 20" stroke="purple" strokeWidth="0.5" fill="none"/>
                    <path d="M0 30 Q5 25 10 30 T20 30" stroke="purple" strokeWidth="0.5" fill="none"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#wave)"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
