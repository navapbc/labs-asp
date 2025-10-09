# Unit Testing with Vitest

This document provides comprehensive guidance for writing unit tests for the client application using Vitest with browser testing capabilities.

## Table of Contents

- [Overview](#overview)
- [Setup and Configuration](#setup-and-configuration)
- [Testing Patterns](#testing-patterns)
- [Component Testing](#component-testing)
- [Hook Testing](#hook-testing)
- [Utility Function Testing](#utility-function-testing)
- [Mocking Strategies](#mocking-strategies)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

This project uses **Vitest** with **browser testing** capabilities for unit testing React components. The setup includes:

- **Vitest** as the test runner
- **Playwright** as the browser provider
- **vitest-browser-react** for React component testing utilities
- **Browser-based testing** for realistic component behavior

### Key Features

- ✅ Browser-based testing (not jsdom)
- ✅ Real DOM interactions
- ✅ Component rendering with React
- ✅ Mocking capabilities
- ✅ TypeScript support
- ✅ Parallel test execution

## Setup and Configuration

### Test Configuration

The project is configured in `vitest.config.mjs`:

```javascript
import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [
        { browser: 'chromium' },
      ],
    },
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/tests/e2e/**',
      '**/tests/routes/**',
      '**/lib/ai/models.test.ts',
    ],
  }
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test benefit-applications-landing.test.tsx
```

## Testing Patterns

### Basic Test Structure

```typescript
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { MyComponent } from '@/components/my-component'

test('component renders correctly', async () => {
  const { getByText } = render(<MyComponent />)
  
  await expect.element(getByText('Expected Text')).toBeInTheDocument()
})
```

### Test File Organization

```
client/
├── tests/
│   ├── client/           # Unit tests for components
│   │   ├── component-name.test.tsx
│   │   └── ...
│   ├── e2e/             # End-to-end tests
│   ├── fixtures.ts      # Test fixtures
│   └── helpers.ts       # Test utilities
```

## Component Testing

### Basic Component Test

```typescript
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { Button } from '@/components/ui/button'

test('Button renders with correct text', async () => {
  const { getByRole } = render(<Button>Click me</Button>)
  
  await expect.element(getByRole('button')).toBeInTheDocument()
  await expect.element(getByRole('button')).toHaveTextContent('Click me')
})
```

### Component with Props Testing

```typescript
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { BenefitApplicationsLanding } from '@/components/benefit-applications-landing'

// Mock props using vi.hoisted for better performance
const mockProps = vi.hoisted(() => ({
  input: '',
  setInput: vi.fn(),
  isReadonly: false,
  chatId: 'test-chat-id',
  sendMessage: vi.fn(),
  selectedVisibilityType: 'private' as const,
  status: 'ready' as const,
  stop: vi.fn(),
  attachments: [],
  setAttachments: vi.fn(),
  messages: [],
  setMessages: vi.fn(),
}))

test('BenefitApplicationsLanding renders correctly', async () => {
  const { getByText } = render(<BenefitApplicationsLanding {...mockProps} />)
  
  await expect.element(getByText(/Get started on/)).toBeInTheDocument()
  await expect.element(getByText(/benefit applications/)).toBeInTheDocument()
})
```

### Testing User Interactions

```typescript
test('Button click triggers callback', async () => {
  const handleClick = vi.fn()
  const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>)
  
  await getByRole('button').click()
  
  expect(handleClick).toHaveBeenCalledOnce()
})
```

### Testing Form Inputs

```typescript
test('Input field updates value', async () => {
  const setInput = vi.fn()
  const { getByRole } = render(
    <input 
      value="test" 
      onChange={(e) => setInput(e.target.value)} 
      data-testid="test-input"
    />
  )
  
  const input = getByRole('textbox')
  await input.fill('new value')
  
  expect(setInput).toHaveBeenCalledWith('new value')
})
```

## Hook Testing

### Custom Hook Testing

```typescript
import { expect, test } from 'vitest'
import { renderHook, act } from 'vitest-browser-react'
import { useCustomHook } from '@/hooks/use-custom-hook'

test('useCustomHook returns initial state', () => {
  const { result } = renderHook(() => useCustomHook())
  
  expect(result.current.value).toBe('initial')
})

test('useCustomHook updates state', () => {
  const { result } = renderHook(() => useCustomHook())
  
  act(() => {
    result.current.setValue('updated')
  })
  
  expect(result.current.value).toBe('updated')
})
```

## Utility Function Testing

### Pure Function Testing

```typescript
import { expect, test } from 'vitest'
import { formatDate, calculateTotal } from '@/lib/utils'

test('formatDate formats date correctly', () => {
  const date = new Date('2024-01-15')
  expect(formatDate(date)).toBe('Jan 15, 2024')
})

test('calculateTotal sums numbers correctly', () => {
  expect(calculateTotal([1, 2, 3])).toBe(6)
  expect(calculateTotal([])).toBe(0)
})
```

## Mocking Strategies

### Mocking Functions

```typescript
import { vi } from 'vitest'

// Mock a function
const mockFunction = vi.fn()

// Mock with implementation
const mockFunctionWithImpl = vi.fn().mockImplementation((x) => x * 2)

// Mock return value
const mockFunctionWithReturn = vi.fn().mockReturnValue('mocked value')

// Mock resolved value for async functions
const mockAsyncFunction = vi.fn().mockResolvedValue('async result')
```

### Mocking Modules

```typescript
import { vi } from 'vitest'

// Mock entire module
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' }),
  postData: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock with partial implementation
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return {
    ...actual,
    specificFunction: vi.fn(),
  }
})
```

### Mocking React Hooks

```typescript
import { vi } from 'vitest'

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/current-path',
}))

// Mock useChat
vi.mock('@ai-sdk/react', () => ({
  useChat: () => ({
    messages: [],
    input: '',
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    isLoading: false,
  }),
}))
```

### Mocking External APIs

```typescript
import { vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

test('API call works correctly', async () => {
  const mockResponse = { data: 'test' }
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse),
  } as Response)
  
  // Your test code here
})
```

## Best Practices

### 1. Test Organization

- **One test file per component** (e.g., `button.test.tsx`)
- **Group related tests** using `describe` blocks
- **Use descriptive test names** that explain the behavior

```typescript
describe('Button Component', () => {
  describe('Rendering', () => {
    test('renders with default props', async () => {
      // test implementation
    })
  })
  
  describe('Interactions', () => {
    test('calls onClick when clicked', async () => {
      // test implementation
    })
  })
})
```

### 2. Query Selection

**Prefer semantic queries in this order:**

1. `getByRole` - Most accessible
2. `getByLabelText` - For form elements
3. `getByText` - For text content
4. `getByTestId` - Last resort for non-semantic elements

```typescript
// ✅ Good - semantic
const button = getByRole('button', { name: 'Submit' })
const input = getByLabelText('Email address')

// ❌ Avoid - non-semantic
const element = getByTestId('submit-btn')
```

### 3. Async Testing

**Always use async/await with browser testing:**

```typescript
test('async operation completes', async () => {
  const { getByText } = render(<AsyncComponent />)
  
  // ✅ Good - use await
  await expect.element(getByText('Loaded')).toBeInTheDocument()
  
  // ❌ Avoid - no await
  expect.element(getByText('Loaded')).toBeInTheDocument()
})
```

### 4. Mock Management

**Use `vi.hoisted()` for better performance:**

```typescript
// ✅ Good - hoisted mocks
const mockProps = vi.hoisted(() => ({
  onClick: vi.fn(),
  value: 'test',
}))

// ❌ Avoid - inline mocks in tests
test('example', () => {
  const mockFn = vi.fn() // Creates new mock each time
})
```

### 5. Test Data

**Create reusable test data:**

```typescript
// test-data.ts
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
}

export const mockMessages = [
  { id: '1', content: 'Hello', role: 'user' },
  { id: '2', content: 'Hi there', role: 'assistant' },
]
```

## Common Patterns

### Testing Conditional Rendering

```typescript
test('shows loading state when loading', async () => {
  const { getByText, queryByText } = render(
    <Component isLoading={true} />
  )
  
  await expect.element(getByText('Loading...')).toBeInTheDocument()
  expect(queryByText('Content')).not.toBeInTheDocument()
})
```

### Testing Error States

```typescript
test('displays error message on error', async () => {
  const { getByText } = render(
    <Component error="Something went wrong" />
  )
  
  await expect.element(getByText('Something went wrong')).toBeInTheDocument()
})
```

### Testing Multiple Elements

```typescript
test('renders list of items', async () => {
  const items = ['Item 1', 'Item 2', 'Item 3']
  const { getAllByRole } = render(<List items={items} />)
  
  const listItems = getAllByRole('listitem')
  expect(listItems).toHaveLength(3)
  
  for (let i = 0; i < items.length; i++) {
    await expect.element(listItems[i]).toHaveTextContent(items[i])
  }
})
```

### Testing Form Submissions

```typescript
test('submits form with correct data', async () => {
  const handleSubmit = vi.fn()
  const { getByRole, getByLabelText } = render(
    <form onSubmit={handleSubmit}>
      <input name="email" aria-label="Email" />
      <button type="submit">Submit</button>
    </form>
  )
  
  await getByLabelText('Email').fill('test@example.com')
  await getByRole('button', { name: 'Submit' }).click()
  
  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      email: 'test@example.com',
    })
  )
})
```

## Troubleshooting

### Common Issues

#### 1. Element Not Found

```typescript
// ❌ Problem: Element not found
const element = getByText('Text') // Throws error

// ✅ Solution: Use queryBy* for optional elements
const element = queryByText('Text')
if (element) {
  // Element exists
}
```

#### 2. Async Operations

```typescript
// ❌ Problem: Not waiting for async operations
test('async test', () => {
  render(<AsyncComponent />)
  expect(getByText('Loaded')).toBeInTheDocument() // Fails
})

// ✅ Solution: Use await
test('async test', async () => {
  render(<AsyncComponent />)
  await expect.element(getByText('Loaded')).toBeInTheDocument()
})
```

#### 3. Mock Not Working

```typescript
// ❌ Problem: Mock not applied
vi.mock('@/lib/api')
// Mock not working because module already imported

// ✅ Solution: Mock before imports
vi.mock('@/lib/api', () => ({
  fetchData: vi.fn(),
}))

import { fetchData } from '@/lib/api'
```

#### 4. Browser Context Issues

```typescript
// ❌ Problem: Tests interfering with each other
test('test 1', () => {
  // Modifies global state
})

test('test 2', () => {
  // Affected by test 1
})

// ✅ Solution: Clean up between tests
afterEach(() => {
  vi.clearAllMocks()
  // Clean up any global state
})
```

### Debugging Tips

1. **Use `screen.debug()`** to see current DOM state
2. **Add `console.log()`** to understand test flow
3. **Use `--reporter=verbose`** for detailed output
4. **Check browser console** for errors
5. **Use `--no-coverage`** for faster debugging

```bash
# Debug mode
pnpm test --reporter=verbose --no-coverage
```

### Performance Tips

1. **Use `vi.hoisted()`** for mocks
2. **Mock heavy dependencies** (APIs, external libraries)
3. **Use `beforeAll`** for expensive setup
4. **Clean up resources** in `afterEach`
5. **Run tests in parallel** (default behavior)

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [vitest-browser-react Documentation](https://github.com/vitest-dev/vitest-browser-react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
