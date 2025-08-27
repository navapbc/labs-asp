# Chat Interface - Vercel AI Chatbot Template Style

This project now features a modern chat interface inspired by the [Vercel AI Chatbot Template](https://vercel.com/templates/next.js/nextjs-ai-chatbot) with a clean, professional design that matches the look and feel of modern AI applications.

## Features

### 🎨 Modern UI Components
- **ChatHeader**: Displays current task, progress, and expandable activity view
- **ChatMessage**: Individual message bubbles with user/assistant avatars and timestamps
- **ChatInput**: Auto-resizing textarea with send and pause buttons
- **TypingIndicator**: Animated dots showing when AI is responding
- **BrowserView**: Simulated browser interface for web automation context
- **AIResponseDisplay**: Structured display of AI response objects with icons and colors

### 🎯 Design System
- **Color Scheme**: Modern blue primary color with semantic color coding
- **Typography**: Clean, readable fonts with proper hierarchy
- **Spacing**: Consistent spacing using Tailwind CSS design tokens
- **Responsive**: Mobile-friendly design that works on all screen sizes

### 🔧 Technical Features
- **TypeScript**: Fully typed components with proper interfaces
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Component Architecture**: Modular, reusable components
- **State Management**: React hooks for chat state and AI responses
- **Auto-scroll**: Messages automatically scroll to bottom
- **Loading States**: Visual feedback during AI processing

## Component Structure

```
src/components/
├── ui/                    # Base UI components (shadcn/ui style)
│   ├── button.tsx        # Button component with variants
│   ├── card.tsx          # Card layout components
│   ├── input.tsx         # Input field component
│   ├── textarea.tsx      # Textarea component
│   ├── scroll-area.tsx   # Scrollable container
│   └── avatar.tsx        # Avatar component
├── chat-header.tsx       # Chat header with progress
├── chat-message.tsx      # Individual message display
├── chat-input.tsx        # Message input with controls
├── typing-indicator.tsx  # AI typing animation
├── browser-view.tsx      # Browser simulation
├── ai-response-display.tsx # AI response visualization
└── index.ts              # Component exports
```

## Usage

### Basic Chat Interface
```tsx
import { 
  ChatHeader, 
  ChatMessage, 
  ChatInput, 
  TypingIndicator 
} from '@/components'

function ChatPage() {
  return (
    <div className="h-screen bg-background flex flex-col">
      <ChatHeader 
        title="Task Name"
        progress={75}
        onBack={() => router.back()}
      />
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <ChatMessage key={index} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </div>
        </ScrollArea>
      </div>
      
      <ChatInput 
        onSubmit={handleSubmit}
        disabled={isLoading}
        placeholder="Type a message..."
      />
    </div>
  )
}
```

### AI Response Display
```tsx
import { AIResponseDisplay } from '@/components'

// The component automatically handles different response types:
const aiResponse = {
  message: "Processing your request...",
  action: "Navigating to website",
  progress: 45,
  url: "https://example.com",
  status: "In progress"
}

<AIResponseDisplay object={aiResponse} />
```

## Styling

### Color Variables
The interface uses CSS custom properties for consistent theming:

```css
:root {
  --primary: 221.2 83.2% 53.3%;        /* Blue */
  --primary-foreground: 210 40% 98%;   /* White */
  --background: 0 0% 100%;             /* White */
  --foreground: 224 71.4% 4.1%;        /* Dark gray */
  --muted: 220 14.3% 95.9%;           /* Light gray */
  --muted-foreground: 220 8.9% 46.1%; /* Medium gray */
  --border: 220 13% 91%;              /* Border gray */
}
```

### Semantic Colors
- **Blue**: Primary actions and user messages
- **Green**: Success states and completed tasks
- **Red**: Errors and warnings
- **Yellow**: Information and details
- **Purple**: Progress indicators
- **Orange**: Screenshots and media
- **Teal**: Next steps and guidance

## Browser View

The right side of the chat interface shows a simulated browser view that:
- Displays the current URL being navigated
- Shows browser controls (close, minimize, maximize buttons)
- Provides context for web automation tasks
- Can be extended to show actual website content or screenshots

## Responsive Design

The interface is designed to work on all screen sizes:
- **Desktop**: Full two-panel layout (chat + browser)
- **Tablet**: Adjusted spacing and sizing
- **Mobile**: Stacked layout with proper touch targets

## Accessibility

- **ARIA Labels**: Proper labeling for screen readers
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Clear focus indicators
- **Color Contrast**: WCAG compliant color combinations
- **Semantic HTML**: Proper heading structure and landmarks

## Customization

### Adding New Message Types
```tsx
// In ai-response-display.tsx, add new field types:
{ key: 'newField', icon: <NewIcon className="w-4 h-4" />, bg: 'bg-new-50', text: 'text-new-900', border: 'border-new-500' }
```

### Modifying Colors
```css
/* In globals.css, update CSS variables: */
:root {
  --primary: 221.2 83.2% 53.3%; /* Change to your brand color */
}
```

### Adding New Components
```tsx
// Create new component files and export from index.ts
export { NewComponent } from './new-component'
```

## Dependencies

- **Next.js 15**: React framework
- **React 18**: UI library
- **Tailwind CSS**: Utility-first CSS
- **Lucide React**: Icon library
- **Radix UI**: Accessible component primitives
- **TypeScript**: Type safety

## Getting Started

1. **Install dependencies**: `npm install`
2. **Run development server**: `npm run next:dev`
3. **Navigate to chat**: `/dashboard/client/[id]/chat`
4. **Customize**: Modify components and styles as needed

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

The interface uses modern CSS features and is designed for current browser versions.
