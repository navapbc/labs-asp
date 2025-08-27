import { NextRequest } from 'next/server'
import { mastra } from '../../../mastra/index'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    
    // Get the last user message
    const lastMessage = messages[messages.length - 1]
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return new Response('Invalid message format', { status: 400 })
    }

    // Get the web automation agent from Mastra
    const webAutomationAgent = mastra.getAgent('webAutomationAgent')
    
    if (!webAutomationAgent) {
      return new Response('Web automation agent not found', { status: 500 })
    }

    // Create a stream from the web automation agent
    const stream = await webAutomationAgent.stream(lastMessage.content, {
      maxSteps: 20, // Limit steps for web UI
      temperature: 0.1,
    })

    // Return the stream as a response
    return stream.toDataStreamResponse()
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
