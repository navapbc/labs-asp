# Riverside County Benefits Portal - Frontend Setup

This guide will help you set up and run the frontend application for the Riverside County Benefits Portal.

## Prerequisites

- Node.js 20.9.0 or higher
- pnpm (recommended) or npm
- The Mastra backend should be running

## Installation

1. Install the new frontend dependencies:
```bash
pnpm install
```

## Configuration

The application is already configured with:
- Next.js 15
- Tailwind CSS
- shadcn/ui components
- Vercel AI SDK integration
- TypeScript

## Running the Application

### Note - the application can run without running the mastra backend in sync with the frontend

1. Start the Mastra backend (in one terminal):
```bash
pnpm dev
```

2. Start the Next.js frontend (in another terminal):
```bash
pnpm next:dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Features

### Login Page
- Simple authentication interface
- Demo credentials: `admin@riverside.gov` / `password123`

### Dashboard
- View all clients and their benefits
- Add new clients
- Client status management
- Benefits tracking

### Client Detail Page
- Client information display
- Benefits overview
- Quick action buttons
- Riverside County program information

### AI Chat Interface
- Integration with the Web Automation Agent
- Real-time chat with AI assistance
- Benefits application help
- Website navigation assistance

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   └── chat/         # Chat API integration
│   ├── dashboard/         # Dashboard pages
│   │   ├── page.tsx      # Main dashboard
│   │   └── client/       # Client management
│   │       └── [id]/     # Dynamic client routes
│   │           ├── page.tsx      # Client detail
│   │           └── chat/         # Chat interface
│   │               └── page.tsx
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Login page
├── components/            # UI components
│   └── ui/               # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       └── input.tsx
├── lib/                   # Utility functions
│   └── utils.ts          # Class name utilities
└── mastra/                # Mastra backend integration
```

## Integration with Mastra

The frontend integrates with the Mastra backend through:
- API routes in `/api/chat`
- Web Automation Agent for benefits applications
- Real-time streaming responses
- Client data management

## Available Benefits Programs

The system supports Riverside County benefits including:
- **CalFresh (SNAP)**: Food assistance program
- **Medi-Cal**: Health coverage for low-income individuals
- **WIC**: Women, Infants, and Children nutrition program
- **Housing Assistance**: Rental and housing support programs

## Development

### Adding New Components
Use shadcn/ui CLI to add new components:
```bash
npx shadcn@latest add [component-name]
```

### Styling
- Tailwind CSS for utility-first styling
- CSS variables for theming
- Responsive design with mobile-first approach

### State Management
- React hooks for local state
- Next.js routing for navigation
- Vercel AI SDK for chat functionality

## Troubleshooting

### Common Issues

1. **Import errors**: Ensure all dependencies are installed
2. **JSX errors**: Check TypeScript configuration
3. **Styling issues**: Verify Tailwind CSS is properly configured
4. **API errors**: Ensure Mastra backend is running

### Debug Mode
Enable debug logging in the Mastra backend by setting the logger level to 'debug' in `src/mastra/index.ts`.

## Deployment

The application can be deployed to:
- Vercel (recommended)
- Netlify
- Any platform supporting Next.js

## Support

For issues or questions:
1. Check the Mastra documentation
2. Review the console logs
3. Ensure all dependencies are up to date
