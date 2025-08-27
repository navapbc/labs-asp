import { mastra } from '../../../mastra/index'
import { z } from 'zod'

export async function POST(req: Request) {
  const body = await req.json()
  const webAutomationAgent = mastra.getAgent('webAutomationAgent')
  
  if (!webAutomationAgent) {
    return new Response('Web automation agent not found', { status: 500 })
  }

  // Create a stream from the web automation agent with structured output
  const stream = await webAutomationAgent.stream(body.input, {
    output: z.object({
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
  })

  // Return the stream as a response
  return stream.toTextStreamResponse()
}