# Browser Session Isolation Issue - Technical Analysis

**Date:** 2025-01-11
**Component:** Browser Streaming Service
**Severity:** High
**Status:** Root cause identified, solution proposed

---

## Executive Summary

When users start new chat sessions in the Mastra Playground or AI Chatbot, they observe the previous session's browser page instead of a fresh isolated browser context. This occurs because the browser streaming service (`browser-streaming-server.js`) incorrectly maps new sessions to existing browser page targets rather than selecting unused targets corresponding to newly created isolated browser contexts.

**Root Cause:** The CDP target selection logic always returns the first available page target, even when multiple isolated contexts (and their corresponding page targets) exist within the same browser process.

**Proposed Solution:** Implement session-to-target mapping to ensure each chat session connects to its own isolated page target.

---

## System Architecture Overview

```
User Chat Session Flow:
=====================

Chat 1 (threadId: abc123)
  ↓
POST /chat → Mastra Backend (:4112)
  ↓
webAutomationAgent.stream(messages)
  ↓
Tool call: browser_navigate(url)
  ↓
Playwright MCP Server (:8931, --isolated flag)
  ↓
Browser Process (CDP Port: 45678) [NEW BROWSER]
  └─ Browser Context 1 → Page Target A
  ↓
Browser Streaming WebSocket (:8933)
  ↓
getCDPEndpoint(sessionId_1)
  ↓
CDP.List({ port: 45678 }) → [Target A]
  ↓
targets.find() → Target A ✓ CORRECT
```

```
Chat 2 (threadId: xyz789) [PROBLEM OCCURS HERE]
  ↓
POST /chat → Mastra Backend (:4112)
  ↓
webAutomationAgent.stream(messages)
  ↓
Tool call: browser_navigate(url)
  ↓
Playwright MCP Server (:8931, --isolated flag)
  ↓
SAME Browser Process (CDP Port: 45678) [REUSED]
  ├─ Browser Context 1 → Page Target A
  └─ Browser Context 2 → Page Target B [NEW CONTEXT]
  ↓
Browser Streaming WebSocket (:8933)
  ↓
getCDPEndpoint(sessionId_2)
  ↓
CDP.List({ port: 45678 }) → [Target A, Target B]
  ↓
targets.find() → Target A ✗ WRONG! Should be Target B
```

---

## Root Cause Analysis

### 1. Playwright MCP `--isolated` Flag Behavior

**Configuration:** `playwright-mcp/start-services.sh:14`
```bash
--isolated \
--browser chromium \
```

**What `--isolated` Actually Does:**

According to the Playwright MCP source code (`browserContextFactory.ts:111-137`):

```typescript
class IsolatedContextFactory extends BaseContextFactory {
  protected override async _doObtainBrowser(clientInfo: ClientInfo): Promise<playwright.Browser> {
    await injectCdpPort(this.config.browser); // ← Called once per browser
    const browserType = playwright[this.config.browser.browserName];
    return browserType.launch({
      tracesDir,
      ...this.config.browser.launchOptions,
      handleSIGINT: false,
      handleSIGTERM: false,
    });
  }

  protected override async _doCreateContext(browser: playwright.Browser): Promise<playwright.BrowserContext> {
    return browser.newContext(this.config.browser.contextOptions); // ← New context per call
  }
}
```

**Key Discovery from `BaseContextFactory._obtainBrowser` (lines 64-77):**

```typescript
protected async _obtainBrowser(clientInfo: ClientInfo): Promise<playwright.Browser> {
  if (this._browserPromise)
    return this._browserPromise; // ← REUSES existing browser process!

  testDebug(`obtain browser (${this._logName})`);
  this._browserPromise = this._doObtainBrowser(clientInfo);

  void this._browserPromise.then(browser => {
    browser.on('disconnected', () => {
      this._browserPromise = undefined;
    });
  }).catch(() => {
    this._browserPromise = undefined;
  });

  return this._browserPromise;
}
```

**Actual Behavior:**

| Tool Call | Browser Process | CDP Port | Browser Context | Page Target |
|-----------|-----------------|----------|-----------------|-------------|
| `browser_navigate` #1 (Chat 1) | New process | 45678 (random) | Context 1 | Target A |
| `browser_navigate` #2 (Chat 2) | **REUSED** | 45678 (same) | Context 2 | Target B |
| `browser_navigate` #3 (Chat 3) | **REUSED** | 45678 (same) | Context 3 | Target C |

**Conclusion:**
- The `--isolated` flag creates **isolated browser contexts**, not isolated browser processes
- All contexts share the **same browser process** and **same CDP port**
- This is by design for resource efficiency

### 2. CDP Port Generation

**Code:** `browserContextFactory.ts:246-260`

```typescript
async function injectCdpPort(browserConfig: FullConfig['browser']) {
  if (browserConfig.browserName === 'chromium')
    (browserConfig.launchOptions as any).cdpPort = await findFreePort();
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => { // ← Port 0 = random available port
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
```

**Key Points:**
- CDP port is generated **once per browser launch**
- Port is **random but consistent** for the lifetime of that browser process
- All contexts within that browser share the same CDP port

### 3. Browser Streaming Target Selection Bug

**Location:** `browser-streaming-server.js:376-414`

**Current Implementation:**

```javascript
async getCDPEndpoint() {
  try {
    const detectedPort = await this.findChromePort();
    if (!detectedPort) {
      console.log('No Playwright Chrome process detected yet');
      return null;
    }

    const portToTry = detectedPort;
    console.log(`Attempting to connect to Chrome CDP on port ${portToTry}`);

    const CDP = require('chrome-remote-interface');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targets = await CDP.List({ port: portToTry });
    console.log('Available CDP targets:', targets.map(t => ({
      type: t.type,
      url: t.url,
      title: t.title
    })));

    // Find the first page target
    const pageTarget = targets.find(target => target.type === 'page'); // ← BUG!

    if (pageTarget) {
      console.log('Found page target:', pageTarget.webSocketDebuggerUrl);
      this.cdpPort = portToTry;
      return pageTarget.webSocketDebuggerUrl;
    }

    console.warn('No page target found, available targets:', targets.map(t => t.type));
    return null;
  } catch (error) {
    console.log('Error connecting to CDP:', error.message);
    return null;
  }
}
```

**The Problem:**

When `CDP.List({ port: 45678 })` is called after multiple contexts are created:

```javascript
// Example output when 3 chat sessions are active:
targets = [
  { id: 'E1F2G3', type: 'page', url: 'https://example.com', title: 'Example' },    // Chat 1
  { id: 'H4I5J6', type: 'page', url: 'https://google.com', title: 'Google' },      // Chat 2
  { id: 'K7L8M9', type: 'page', url: 'https://github.com', title: 'GitHub' }       // Chat 3
]

// Current code:
const pageTarget = targets.find(target => target.type === 'page');
// Always returns targets[0] → Chat 1's page!
```

**Missing Logic:**
- No tracking of which `sessionId` maps to which `targetId`
- No detection of which targets are already "claimed" by active sessions
- No selection logic to pick unused targets for new sessions

### 4. Session Storage Structure

**Current Implementation:** `browser-streaming-server.js:46`

```javascript
this.activeSessions = new Map(); // Map<sessionId, {ws, client, cdpEndpoint, controlMode}>
```

**What's Stored:**
```javascript
{
  sessionId: 'browser-doc1-1234567890',
  ws: WebSocket,
  client: CDPClient,
  cdpEndpoint: 'ws://localhost:45678/devtools/page/E1F2G3',
  controlMode: 'agent'
}
```

**What's Missing:**
- No `targetId` field to track which CDP target this session owns
- No reverse lookup: `targetId → sessionId`
- No cleanup of target mappings when sessions end

---

## Reproduction Steps

### Prerequisites
- Mastra Playground or AI Chatbot running
- Playwright MCP server with `--isolated` flag
- Browser streaming service active

### Test Scenario

**Step 1: Start First Chat Session**

```
Action: User creates Chat 1, sends message "Navigate to https://example.com"
Expected:
  - New browser context created
  - Page navigates to example.com
  - Browser streaming shows example.com
Actual: ✓ Works correctly
```

**Step 2: Start Second Chat Session**

```
Action: User creates Chat 2 (different thread), sends "Navigate to https://google.com"
Expected:
  - New isolated browser context created in same browser
  - Page navigates to google.com
  - Browser streaming shows google.com
Actual: ✗ Browser streaming shows example.com (Chat 1's page)
```

**Step 3: Verify Isolation**

```
Action: Check browser developer tools
Expected:
  - Two separate page targets visible in CDP
  - Target A: example.com (Chat 1)
  - Target B: google.com (Chat 2)
Actual: ✓ Both targets exist, but streaming connects to Target A for both sessions
```

### Debug Output

```bash
# When Chat 2's streaming connects:
Browser streaming client connected
Attempt 1/15: Waiting for Playwright browser to be available...
Found Playwright Chrome CDP port: 45678
Attempting to connect to Chrome CDP on port 45678
Available CDP targets: [
  { type: 'page', url: 'https://example.com/', title: 'Example Domain' },
  { type: 'page', url: 'https://google.com/', title: 'Google' }
]
Found page target: ws://localhost:45678/devtools/page/E1F2G3  # ← Always first!
Browser capture started for session: browser-doc2-9876543210
```

---

## Proposed Solution

### Option 1: Session-to-Target Mapping (Recommended)

**Approach:** Track which CDP targets are claimed by which sessions, ensuring new sessions select unused targets.

**Implementation Changes:**

#### A. Add Target Tracking

**File:** `browser-streaming-server.js:46`

```javascript
class BrowserStreamingService extends EventEmitter {
  constructor(port, cdpPort = 9222) {
    super();
    this.port = port;
    this.cdpPort = cdpPort;
    this.wss = new WebSocketServer({ port });
    this.activeSessions = new Map(); // Map<sessionId, SessionInfo>
    this.sessionToTarget = new Map(); // NEW: Map<sessionId, targetId>
  }
}
```

#### B. Update `getCDPEndpoint()` with Target Selection Logic

**File:** `browser-streaming-server.js:376-414` (replace entire function)

```javascript
async getCDPEndpoint(sessionId) {
  try {
    // Check if this session already has a mapped target
    if (this.sessionToTarget.has(sessionId)) {
      const targetId = this.sessionToTarget.get(sessionId);
      console.log(`Session ${sessionId} already mapped to target ${targetId}`);

      // Re-fetch target to get current WebSocket URL
      const detectedPort = await this.findChromePort();
      if (!detectedPort) return null;

      const CDP = require('chrome-remote-interface');
      const targets = await CDP.List({ port: detectedPort });
      const target = targets.find(t => t.id === targetId);

      if (target) {
        return target.webSocketDebuggerUrl;
      } else {
        // Target no longer exists, remove mapping
        console.warn(`Target ${targetId} no longer exists, removing mapping`);
        this.sessionToTarget.delete(sessionId);
      }
    }

    // Find Chrome CDP port
    const detectedPort = await this.findChromePort();
    if (!detectedPort) {
      console.log('No Playwright Chrome process detected yet');
      return null;
    }

    console.log(`Attempting to connect to Chrome CDP on port ${detectedPort}`);

    // Connect to CDP and list all targets
    const CDP = require('chrome-remote-interface');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const targets = await CDP.List({ port: detectedPort });
    console.log('Available CDP targets:', targets.map(t => ({
      type: t.type,
      url: t.url,
      title: t.title,
      id: t.id
    })));

    // Get all page targets
    const pageTargets = targets.filter(target => target.type === 'page');

    if (pageTargets.length === 0) {
      console.warn('No page targets found');
      return null;
    }

    // Get target IDs already claimed by other sessions
    const claimedTargetIds = new Set(
      Array.from(this.activeSessions.values())
        .map(session => session.targetId)
        .filter(Boolean)
    );

    console.log(`Claimed targets: [${Array.from(claimedTargetIds).join(', ')}]`);

    // Find the newest unclaimed target (targets are ordered oldest to newest)
    // We reverse to prefer newer targets for new sessions
    const availableTarget = pageTargets.reverse().find(target =>
      !claimedTargetIds.has(target.id)
    );

    if (!availableTarget) {
      console.warn('No available (unclaimed) page targets found');
      console.warn(`Total targets: ${pageTargets.length}, All claimed by existing sessions`);
      return null;
    }

    console.log(`Mapping session ${sessionId} to target ${availableTarget.id} (${availableTarget.url})`);

    // Store the mapping
    this.sessionToTarget.set(sessionId, availableTarget.id);
    this.cdpPort = detectedPort;

    return availableTarget.webSocketDebuggerUrl;

  } catch (error) {
    console.log('Error connecting to CDP (this is normal if browser not ready yet):', error.message);
    return null;
  }
}
```

#### C. Update `startBrowserCapture()` to Store Target ID

**File:** `browser-streaming-server.js:117-214`

**Changes:**

```javascript
async startBrowserCapture(ws, sessionId) {
  try {
    // ... existing retry logic ...

    // Connect to CDP and start screencast
    const CDP = require('chrome-remote-interface');
    const client = await CDP({ target: cdpEndpoint });

    // Extract target ID from WebSocket debugger URL
    // Format: ws://localhost:45678/devtools/page/E1F2G3H4I5J6
    const targetIdMatch = cdpEndpoint.match(/\/devtools\/page\/(.+)$/);
    const targetId = targetIdMatch ? targetIdMatch[1] : null;

    if (!targetId) {
      console.warn(`Could not extract target ID from: ${cdpEndpoint}`);
    }

    const { Page, Runtime } = client;

    await Page.enable();
    await Runtime.enable();

    // Start screencast
    await Page.startScreencast({
      format: 'jpeg',
      quality: 80,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1
    });

    // ... existing frame handler ...

    // Store session info with target ID
    this.activeSessions.set(sessionId, {
      ws,
      client,
      cdpEndpoint,
      targetId,        // NEW: Track which target this session owns
      controlMode: 'agent',
    });

    // Notify client that streaming started
    ws.send(JSON.stringify({
      type: 'streaming-started',
      sessionId,
      cdpEndpoint,
      targetId       // NEW: Include in response for debugging
    }));

    console.log(`Browser capture started for session: ${sessionId}, target: ${targetId}`);

  } catch (error) {
    console.error('Error starting browser capture:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    ws.send(JSON.stringify({
      type: 'error',
      error: `Failed to start browser capture: ${errorMessage}`
    }));
  }
}
```

#### D. Update `stopBrowserCapture()` to Clean Up Mappings

**File:** `browser-streaming-server.js:216-252`

**Changes:**

```javascript
async stopBrowserCapture(sessionId) {
  const session = this.activeSessions.get(sessionId);
  if (!session) {
    console.warn(`No active session found for: ${sessionId}`);
    return;
  }

  try {
    // ONLY stop screencast, don't close the page or browser
    if (session.client && session.client.Page) {
      await session.client.Page.stopScreencast();
    }

    // Close our CDP connection to the target
    if (session.client) {
      await session.client.close();
    }

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Remove target mapping - NEW
    this.sessionToTarget.delete(sessionId);
    console.log(`Removed target mapping for session: ${sessionId}`);

    // Notify client that streaming stopped
    if (session.ws.readyState === 1) { // WebSocket.OPEN
      session.ws.send(JSON.stringify({
        type: 'streaming-stopped',
        sessionId
      }));
    }

    console.log(`Browser capture stopped for session: ${sessionId} (Chrome process remains alive)`);

  } catch (error) {
    console.error('Error stopping browser capture:', error);
  }
}
```

#### E. Add Cleanup on WebSocket Close

**File:** `browser-streaming-server.js:62-72`

**Changes:**

```javascript
ws.on('close', () => {
  console.log('Browser streaming client disconnected');
  // Clean up sessions for this client
  for (const [sessionId, session] of this.activeSessions) {
    if (session.ws === ws) {
      this.stopBrowserCapture(sessionId);
      this.activeSessions.delete(sessionId);
      this.sessionToTarget.delete(sessionId); // NEW: Clean up mapping
    }
  }
});
```

**Pros:**
- ✅ No changes to Playwright MCP configuration
- ✅ No changes to Mastra SDK or agent code
- ✅ Handles unlimited concurrent chat sessions
- ✅ Properly isolates browser contexts via target mapping
- ✅ Automatic cleanup when sessions end

**Cons:**
- ⚠️ Assumes CDP targets are ordered oldest-to-newest (generally true but not guaranteed)
- ⚠️ Requires careful testing of edge cases (target closure, browser restart, etc.)

---

### Option 2: Remove `--isolated` Flag (Not Recommended)

**Approach:** Create separate browser processes for each session instead of reusing one browser with multiple contexts.

**Changes Required:**

**File:** `playwright-mcp/start-services.sh:14`

```bash
# Remove this line:
# --isolated \
```

**Result:**
- Each `browser_navigate` call launches a **new browser process**
- Each browser has a **unique CDP port**
- Browser streaming can potentially differentiate by port (but this still requires tracking)

**Pros:**
- True process-level isolation

**Cons:**
- ❌ Much higher memory usage (each Chrome process uses ~100-300MB)
- ❌ Slower browser startup for each new chat session
- ❌ May still need target tracking if multiple pages exist in one browser
- ❌ Defeats the purpose of Playwright's efficient context isolation
- ❌ Not the intended design pattern for `--isolated` mode

**Recommendation:** Do NOT pursue this option. Keep `--isolated` flag and implement Option 1.

---

## Recommendation: Keep `--isolated` + Implement Target Mapping

### Why Keep `--isolated`?

The `--isolated` flag is **correctly designed** for this use case:

1. **Resource Efficiency:** One browser process can handle multiple isolated contexts
2. **Fast Context Creation:** New contexts spawn in ~100ms vs. ~2-3s for new browser
3. **State Isolation:** Cookies, localStorage, IndexedDB are isolated per context
4. **Security:** Proper process sandboxing without excessive overhead

### Why the Issue Exists

The problem is **not with Playwright MCP**, but with our custom `browser-streaming-server.js`:

- Playwright MCP correctly creates isolated contexts
- Each context has its own page target
- Our streaming server just needs to **select the correct target**

### Implementation Complexity

**Low to Medium:**
- ~50 lines of code changes
- All changes in one file (`browser-streaming-server.js`)
- No external dependencies
- Clear separation of concerns

---

## Testing Plan

### Test Case 1: Sequential Sessions

```
1. Start Chat 1, navigate to example.com
   ✓ Verify streaming shows example.com
   ✓ Verify target mapping created

2. Start Chat 2, navigate to google.com
   ✓ Verify streaming shows google.com (not example.com)
   ✓ Verify separate target mapping created
   ✓ Verify Chat 1 still shows example.com

3. Close Chat 1
   ✓ Verify target mapping removed
   ✓ Verify Chat 2 still shows google.com
```

### Test Case 2: Concurrent Sessions

```
1. Start 5 chat sessions simultaneously
2. Each navigates to a different URL
3. Verify each session's streaming shows the correct page
4. Close sessions in random order
5. Verify no orphaned mappings remain
```

### Test Case 3: Browser Restart

```
1. Start Chat 1, create target mapping
2. Restart Playwright MCP (browser process dies)
3. Start Chat 2, navigate to page
4. Verify old mappings are cleared
5. Verify new session works correctly
```

### Test Case 4: Target Exhaustion

```
1. Create 10+ chat sessions
2. Verify all get unique targets
3. Try creating 11th session
4. Verify graceful handling if all targets claimed
```

---

## Monitoring & Observability

### Logging Enhancements

Add structured logging for target management:

```javascript
console.log('CDP Target Allocation:', {
  sessionId,
  targetId,
  targetUrl,
  totalTargets: pageTargets.length,
  claimedTargets: claimedTargetIds.size,
  availableTargets: pageTargets.length - claimedTargetIds.size
});
```

### Metrics to Track

- Active sessions count
- Target allocation success rate
- Target allocation failures (no available targets)
- Average target lifetime
- Orphaned mappings (sessions without targets)

---

## Open Questions & Future Considerations

### Q1: What happens if a browser context closes but we still have a mapping?

**Answer:** The target will no longer exist when we query `CDP.List()`. The code handles this:

```javascript
const target = targets.find(t => t.id === targetId);
if (!target) {
  console.warn(`Target ${targetId} no longer exists, removing mapping`);
  this.sessionToTarget.delete(sessionId);
}
```

### Q2: Is there a limit to concurrent contexts in one browser?

**Answer:** Chromium supports hundreds of browser contexts. Unlikely to hit limits in normal usage (5-20 concurrent chat sessions).

### Q3: What if two sessions try to claim the same target simultaneously?

**Answer:** Node.js event loop is single-threaded, so Map operations are atomic. Race conditions are unlikely, but we could add mutex locking if needed.

### Q4: Should we implement target health checks?

**Future Enhancement:** Periodically verify that mapped targets still exist:

```javascript
setInterval(async () => {
  const targets = await CDP.List({ port: this.cdpPort });
  const activeTargetIds = new Set(targets.map(t => t.id));

  for (const [sessionId, targetId] of this.sessionToTarget) {
    if (!activeTargetIds.has(targetId)) {
      console.warn(`Stale mapping detected: session ${sessionId} -> target ${targetId}`);
      this.sessionToTarget.delete(sessionId);
    }
  }
}, 30000); // Every 30 seconds
```

---

## References

### Code Locations

| File | Lines | Description |
|------|-------|-------------|
| `playwright-mcp/start-services.sh` | 14 | `--isolated` flag configuration |
| `browser-streaming-server.js` | 46 | Session storage initialization |
| `browser-streaming-server.js` | 117-214 | `startBrowserCapture()` - session setup |
| `browser-streaming-server.js` | 376-414 | `getCDPEndpoint()` - **ROOT CAUSE** |
| `browser-streaming-server.js` | 395-399 | Bug: `targets.find()` returns first match |

### External Documentation

- [Playwright Browser Contexts](https://playwright.dev/docs/browser-contexts)
- [Chrome DevTools Protocol - Target Domain](https://chromedevtools.github.io/devtools-protocol/tot/Target/)
- [Playwright MCP GitHub](https://github.com/microsoft/playwright/tree/main/packages/playwright/src/mcp)

---

## Implementation Checklist

- [ ] Add `sessionToTarget` Map to `BrowserStreamingService` constructor
- [ ] Update `getCDPEndpoint()` to accept `sessionId` parameter
- [ ] Implement target selection logic (filter claimed targets, select newest available)
- [ ] Extract and store `targetId` in `startBrowserCapture()`
- [ ] Add target cleanup in `stopBrowserCapture()`
- [ ] Add target cleanup in WebSocket close handler
- [ ] Update all `getCDPEndpoint()` call sites to pass `sessionId`
- [ ] Add debug logging for target allocation
- [ ] Write unit tests for target selection logic
- [ ] Test with 2 concurrent sessions
- [ ] Test with 5+ concurrent sessions
- [ ] Test session cleanup (close chat, verify mapping removed)
- [ ] Document new behavior in code comments

---

**Next Steps:**

1. Review this document with the team
2. Get approval for Option 1 (Target Mapping)
3. Implement changes in `browser-streaming-server.js`
4. Run test scenarios
5. Deploy to development environment
6. Monitor for edge cases
