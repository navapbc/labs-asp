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
- Hybrid approach: Start with template, gradually customize

## Decision Outcome

**Status: Under Evaluation** - Comparing three Vercel AI SDK approaches:

1. **Custom-built UI (PR #4)**: Full custom implementation with login, dashboard, and client management
2. **Vercel chatbot template (PR #13)**: Template-based approach using [Vercel's Next.js AI chatbot template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)
3. **Hybrid approach**: Start with template foundation, gradually add custom features and user management

All approaches use Vercel AI SDK but differ in implementation strategy and scope.

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

**Development Speed vs. Maintenance Burden:**
- Bad, because requires significant upfront development effort and time investment
- Good, because once built, provides predictable maintenance patterns aligned with existing codebase
- Bad, because increases long-term maintenance burden with more custom code to debug and update

**Customization Flexibility vs. Out-of-the-box Functionality:**
- Good, because provides complete control over user experience and feature implementation
- Good, because can be tailored precisely to project requirements and existing backend patterns
- Bad, because must build all functionality from scratch rather than leveraging existing solutions

**Short-term Demo Needs vs. Long-term Project Architecture:**
- Bad, because slower to get initial demo working due to development complexity
- Good, because creates a solid foundation for long-term project architecture and scalability
- Good, because includes complete user management (login, dashboard, client profiles) for production readiness

**Quality of Existing Templates vs. Building from Scratch:**
- Good, because leverages proven Vercel AI SDK components as building blocks
- Bad, because must implement custom patterns rather than using battle-tested template approaches
- Good, because ensures code quality standards match existing project architecture

### Vercel chatbot template (PR #13)

**Development Speed vs. Maintenance Burden:**
- Good, because dramatically faster implementation using proven template
- Good, because reduced maintenance burden with Vercel team maintaining core template
- Bad, because may require ongoing integration work as template evolves

**Customization Flexibility vs. Out-of-the-box Functionality:**
- Good, because provides immediate out-of-the-box chat functionality
- Bad, because limited to chat interface only (no user management) - though could be added back
- Bad, because template may have limitations for custom requirements and integration patterns

**Short-term Demo Needs vs. Long-term Project Architecture:**
- Good, because enables rapid demo deployment and testing
- Bad, because may require significant refactoring for long-term production architecture
- Good, because includes model selection dropdowns for immediate testing capabilities

**Quality of Existing Templates vs. Building from Scratch:**
- Good, because leverages high-quality, battle-tested Vercel template
- Bad, because requires integration with existing Mastra backend (learning curve - both needed to be up to date with versioning and had to remove existing pattern)
- Good, because lighter weight and focused on chat functionality reduces complexity

### Hybrid approach: Start with template, gradually customize

**Development Speed vs. Maintenance Burden:**
- Good, because enables rapid initial deployment using proven template foundation
- Good, because allows incremental development reducing upfront complexity
- Bad, because may create technical debt if customizations aren't planned carefully
- Good, because maintenance burden grows gradually as features are added

**Customization Flexibility vs. Out-of-the-box Functionality:**
- Good, because starts with working out-of-the-box functionality for immediate demos
- Good, because provides flexibility to add custom features incrementally
- Bad, because may require refactoring template code as customizations grow
- Good, because can adapt to changing requirements without starting over

**Short-term Demo Needs vs. Long-term Project Architecture:**
- Good, because enables quick demo deployment while planning long-term architecture
- Good, because allows validation of core functionality before major custom development
- Bad, because may lead to architectural compromises if not carefully planned
- Good, because provides clear migration path from template to custom solution

**Quality of Existing Templates vs. Building from Scratch:**
- Good, because leverages proven template as solid foundation
- Good, because can selectively replace template components with custom implementations
- Bad, because may inherit template limitations that are hard to remove later
- Good, because allows learning from template patterns before building custom equivalents

## Links

- [PR #4](https://github.com/navapbc/labs-asp/pull/4) - Custom-built UI implementation
- [PR #13](https://github.com/navapbc/labs-asp/pull/13) - Vercel chatbot template implementation
- [Vercel AI SDK](https://sdk.vercel.ai/) - Framework documentation
- [Vercel Next.js AI Chatbot Template](https://vercel.com/templates/next.js/nextjs-ai-chatbot) - Template used in PR #13