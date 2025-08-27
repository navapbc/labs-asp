# Frontend UI Framework Implementation: Custom vs Template Approaches

- Status: proposed
- Deciders: KayTV, fg-nava
- Date: 2025-08-27

Technical Story: [PR #4](https://github.com/navapbc/labs-asp/pull/4) vs [PR #13](https://github.com/navapbc/labs-asp/pull/13)

## Context and Problem Statement

The project needed a frontend user interface to provide a chat experience for users to interact with the Mastra bot for application assistance. The existing codebase had backend functionality but lacked a user-facing interface for end users to access the web automation agent capabilities.

## Decision Drivers

- Need for user-friendly interface to access AI chat functionality
- Integration with existing Mastra web automation agent
- Modern, responsive UI requirements
- Chat-based interaction model for application assistance

## Considered Options

- Custom-built UI with Vercel AI SDK (PR #4)
- Vercel AI SDK chatbot template (PR #13)
- Third-party chat widget integration
- Minimal HTML/CSS interface
- Full-stack framework like Next.js

## Decision Outcome

**Status: Under Evaluation** - Comparing two Vercel AI SDK approaches:

1. **Custom-built UI (PR #4)**: Full custom implementation with login, dashboard, and client management
2. **Vercel chatbot template (PR #13)**: Template-based approach using [Vercel's Next.js AI chatbot template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)

Both approaches use Vercel AI SDK but differ in implementation strategy and scope.

### Positive Consequences

- Modern, responsive chat interface
- Seamless integration with existing Mastra bot
- Professional user experience with login, dashboard, and client management
- Full control over UI/UX design and functionality
- Leverages Vercel AI SDK's proven chat components

### Negative Consequences

- Additional frontend code to maintain
- Requires frontend development expertise
- Potential for UI/UX inconsistencies if not properly maintained

## Pros and Cons of the Options

### Custom-built UI with Vercel AI SDK (PR #4)

- Good, because provides full control over user experience
- Good, because integrates seamlessly with existing backend
- Good, because leverages proven AI chat components
- Good, because includes complete user management (login, dashboard, client profiles)
- Bad, because requires additional frontend development effort
- Bad, because increases codebase complexity
- Bad, because more code to maintain and test

### Vercel chatbot template (PR #13)

- Good, because faster implementation using proven template
- Good, because maintained by Vercel team
- Good, because includes model selection dropdowns for testing
- Good, because lighter weight and focused on chat functionality
- Bad, because limited to chat interface only (no user management)
- Bad, because requires integration with existing Mastra backend
- Bad, because template may have limitations for custom requirements

### Third-party chat widget integration

- Good, because faster implementation
- Good, because maintained by third party
- Bad, because limited customization options
- Bad, because potential vendor lock-in

### Minimal HTML/CSS interface

- Good, because simple and lightweight
- Good, because easy to maintain
- Bad, because poor user experience
- Bad, because limited functionality

### Full-stack framework like Next.js

- Good, because comprehensive solution
- Good, because modern development experience
- Bad, because overkill for simple chat interface
- Bad, because increases complexity and dependencies

## Links

- [PR #4](https://github.com/navapbc/labs-asp/pull/4) - Custom-built UI implementation
- [PR #13](https://github.com/navapbc/labs-asp/pull/13) - Vercel chatbot template implementation
- [Vercel AI SDK](https://sdk.vercel.ai/) - Framework documentation
- [Vercel Next.js AI Chatbot Template](https://vercel.com/templates/next.js/nextjs-ai-chatbot) - Template used in PR #13
