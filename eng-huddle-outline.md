# Engineering Huddle Presentation Outline

**Duration:** 10 minutes
**Presenters:** Foad (Architecture/Infrastructure) + Kaylyn (Frontend/UX)

---

## Key Technical Achievements

### 1. **Hybrid Cloud Architecture (GCP)**
You've implemented a sophisticated multi-service architecture:
- **Compute VM**: Runs browser-streaming + mastra-app containers with automatic VM restart on image changes (terraform/compute.tf:109-131)
- **Cloud Run**: Hosts ai-chatbot frontend + browser-ws-proxy for WebSocket upgrade
- **Smart Environment Management**: Preview branches auto-cleanup, dev/prod persist
- **GitHub Actions CI/CD**: Automated deploy, cleanup, and semantic versioning

### 2. **Real-Time Browser Streaming via CDP**
Your browser streaming implementation is particularly novel:
- **WebSocket → CDP Bridge**: playwright-mcp/browser-streaming-server.js connects to Chrome DevTools Protocol
- **Dual Control Modes**: Agent mode (AI controls) vs User mode (human takeover)
- **Frame Streaming**: JPEG @ 80% quality, 1920x1080, capturing every frame for smooth streaming
- **Smart Coordinate Mapping**: Handles letterboxing/pillarboxing in client.tsx:283-316

### 3. **Production WebSocket Proxy Pattern**
The browser-ws-proxy is elegant:
- Cloud Run upgrades ws:// → wss:// for production security
- Runtime config via /api/browser-ws-config allows environment-specific URLs
- Local dev bypasses proxy, production uses it seamlessly

### 4. **Agent Architecture with Memory**
Your web-automation-agent.ts shows sophisticated design:
- **Semantic Memory**: PostgreSQL + pgvector with 150k token limit for Claude Sonnet 4
- **Tool Call Filtering**: Removes verbose Playwright/DB calls from memory while preserving working memory
- **Multi-Provider Setup**: Vertex Anthropic, Google Gemini, OpenAI with custom scorers
- **Autonomous Progression**: 50 max steps with graceful degradation protocol

### 5. **Infrastructure Automation Challenges**
- **VM Restart Automation**: terraform_data resource with local-exec provisioner (compute.tf:109-131)
- **Preview Environment Lifecycle**: Automatic cleanup on PR close
- **Service Account Management**: Proper IAM with lifecycle rules for recreation

---

## Engineering Challenges Worth Highlighting

1. **WebSocket Coordinate Transformation**: Handling 16:9 aspect ratio scaling with letterboxing (client.tsx:283-349)
2. **Session Persistence**: Browser stays alive when streaming stops, only screencast disconnects (browser-streaming-server.js:216-252)
3. **CDP Target Discovery**: Retry logic with 15 attempts to find Playwright browser (browser-streaming-server.js:117-141)
4. **Control Mode Handoff**: Switching between agent/user control without dropping connection
5. **Terraform State Management**: GCS backend with per-environment prefixes

---

## Presentation Structure (10 minutes)

### Part 1: Architecture Overview (3-4 min)
**Presenter:** Foad

- Show architecture diagram
- Highlight the novel pieces:
  - **CDP-based streaming** (not WebRTC yet, but performant)
  - **Dual-environment setup**: VM for heavy lifting, Cloud Run for scaling
  - **WebSocket proxy pattern** for production security
- Walk through a request flow:
  ```
  User → Next.js (Cloud Run) → Mastra API (VM:4112) → Playwright MCP (VM:8931)
                              ↓
  Browser Stream (VM:8933) → WebSocket Proxy (Cloud Run) → Client
  ```

**Key Points:**
- Why VMs for browser workloads? (Resource isolation, persistent Chrome, CDP access)
- Why Cloud Run for frontend? (Auto-scaling, WebSocket upgrade, cost efficiency)
- Network topology: Internal VM communication, external proxy for clients

---

### Part 2: Infrastructure Engineering (2-3 min)
**Presenter:** Foad

**Key Decisions & Challenges:**

1. **Preview Environment Automation**
   - PR open → Terraform creates unique resources (`app-vm-preview-pr-53`)
   - PR merge → GitHub Actions runs `terraform destroy` automatically
   - Cost optimization: Only dev/prod environments persist

2. **VM Restart Automation**
   - Challenge: How to deploy new Docker images to running VMs?
   - Solution: `terraform_data` resource with `triggers_replace` on image versions
   - Result: `gcloud compute instances reset` runs automatically on image change
   - Location: terraform/compute.tf:109-131

3. **Service Account Management**
   - Challenge: Deleted service accounts caused deployment failures
   - Solution: `create_before_destroy` lifecycle + IAM binding recreation triggers
   - Location: terraform/cloud_run.tf:388-446

4. **Firewall Rules Per Environment**
   - Each environment gets isolated firewall rules for ports 8931, 8933, 4112
   - Allows parallel preview environments without conflicts

**Code Reference:**
```hcl
resource "terraform_data" "vm_restart" {
  triggers_replace = [
    terraform_data.image_versions.output
  ]
  provisioner "local-exec" {
    command = "gcloud compute instances reset ${google_compute_instance.app_vm.name} --zone=${local.zone} --project=${local.project_id}"
  }
}
```

---

### Part 3: Real-Time Streaming Challenges (2-3 min)
**Presenter:** Foad

**Technical Deep Dives:**

1. **CDP Screencast Frame Handling**
   - Connect to Chrome DevTools Protocol via detected port
   - Start screencast at 80% JPEG quality, 1920x1080, every frame
   - Handle backpressure: Check WebSocket state before sending
   - Acknowledge frames to prevent buffer overflow
   - Location: playwright-mcp/browser-streaming-server.js:162-187

2. **Coordinate Transformation for User Input**
   - Problem: Canvas size ≠ browser viewport size
   - Solution: Calculate 16:9 aspect ratio letterboxing/pillarboxing
   - Map click coordinates from canvas space → browser viewport space
   - Location: client/artifacts/browser/client.tsx:283-349

   ```typescript
   const videoAspectRatio = 16 / 9;
   // Calculate rendered video size within canvas
   // Handle letterboxing/pillarboxing
   // Scale coordinates: (mouseX - offsetX) * scaleX
   ```

3. **Control Mode Switching**
   - Agent mode (default): AI has control, user watches
   - User mode: Human takes over via mouse/keyboard/scroll
   - Challenge: Switch without dropping WebSocket connection
   - Solution: Control state managed server-side, input events filtered by mode
   - Location: browser-streaming-server.js:254-276

4. **Session Management Strategy**
   - Stop streaming ≠ Kill Chrome
   - `stop-streaming`: Disconnects CDP screencast only (Chrome stays alive)
   - Why? Agent needs persistent browser state across streaming sessions
   - Location: browser-streaming-server.js:216-252

**Architecture Decision:**
```javascript
// Stop screencast but leave Chrome running
await session.client.Page.stopScreencast();
await session.client.close(); // Close CDP connection only
// Chrome process remains alive for agent control
```

---

### Part 4: Design Philosophy & UX Research (2-3 min)
**Presenters:** Foad + Kaylyn

**Design Philosophy: Ambient, Low-Touch Experience**

The fundamental design constraint that drove all technical decisions:

> **"This is a heads-up experience, not a heads-down experience."** - Jillian

**The Core Problem:**
- Caseworkers need to focus on **clients**, not screens
- Monitor is visible to client during intake conversations
- First-time AI users (not power users)
- Pain point: "I hate having the same conversation with a client more than once" (harm reduction)

**Design Implications:**

1. **Minimal Controls Philosophy**
   - Commercial AI tools (ChatGPT, Claude) = designed for AI power users who want to see reasoning, tool calls, debugging
   - Our tool = designed for caseworkers who want to **talk to clients** while the agent fills forms
   - Result: Stripped Vercel template down to essentials
   - Removed: Document uploads, voting, message editing, copy buttons, close/refresh
   - Goal: "Two big buttons on an iPhone screen" approach

2. **Language & Terminology Challenges**
   - Avoid AI jargon that confuses non-technical users
   - Example: "Takeover mode" might sound intense/foreign to users unfamiliar with chat paradigms
   - Challenge: Balancing technical accuracy with user-friendly language
   - Ongoing refinement based on pilot feedback

3. **Visual Mode Switching**
   - Problem: Users need extremely clear feedback when switching between agent/user control
   - Solution: Fullscreen darkening + status indicators + eventual cursor change
   - Why critical: Client is watching the screen, confusion undermines trust
   - Location: client/artifacts/browser/client.tsx:460-557

4. **Competitive Intelligence Research**
   - Analyzed: ChatGPT Operator, Anthropic's Computer Use, Google Mariner, Director AI
   - Takeaway: Silicon Valley solved general use cases, we specialize for caseworkers
   - Advantage: Can augment their patterns with domain-specific helpers
   - Example: When agent prompts for missing info, we add caseworker-specific documentation (proof of income must be PDF with specific fields)

**Agent Architecture (Foad):**
- **Memory System**: PostgreSQL + pgvector for semantic recall
- **Token Management**: 150k token limit (for Claude Sonnet 4's ~200k context)
- **Tool Call Filtering**: Removes verbose Playwright/DB interactions from memory
- **Working Memory**: Thread-scoped context for case manager state
- **Autonomous Progression**: 50 max steps with fallback protocol
- Location: src/mastra/agents/web-automation-agent.ts:21-62

**Key Technical Challenges (Kaylyn):**

1. **Starting Point: Vercel Chatbot Template**
   - Iteratively removed features to achieve minimal interface
   - Tension: Easy to default to template features vs. designing for non-technical users

2. **Takeover Mode Implementation**
   - Challenge: Making fullscreen browser control intuitive
   - Solution: Darkened fullscreen + "Hand back control" button
   - Visual feedback: Animated status indicators
   - Future: Cursor changes for even clearer mode distinction

3. **Session Continuity**
   - Problem: What happens when user navigates away from browser?
   - Current state: Can't return to old browser sessions in message history
   - In progress: Clear messaging that browser session is closed

4. **Avatar/Loading States**
   - Removed agent avatar initially for simplicity
   - Issue discovered: Blank white space during "thinking" state feels empty
   - Lesson: Some visual feedback is necessary even in minimal design

**Jillian's Design Insight:**
> "We want to design for legibility for a caseworker — the monitor is here and the client is watching, but they're just talking about what's going on. Not 'Oh my God, what's the tool call? Let's troubleshoot this.'"

**Kaylyn's Engineering Insight:**
> "With bigger things, [Cursor] is really good. But a lot of the nitpicky stuff is still going in and finding it yourself. For CSS, I mostly use it to find what's overriding styles in globals."

---

### Conclusion (30 sec)
**Presenter:** Foad

**Strategic Positioning:**
> "Why build something custom when commercial tools exist?"

**Our Answer:**
1. **Specialized for caseworkers**, not AI power users
2. **Harm reduction focus**: Only have traumatic conversations once
3. **Data dancing automation**: Eliminate spreadsheet → database → form busywork
4. **Ambient experience**: Designed for client-facing conversations, not screen-staring

**What's Next:**
- **Pilot learnings**: Validate design decisions with real caseworkers
- **Performance optimization**: Reduce frame latency, explore WebRTC
- **Domain-specific helpers**: Augment agent prompts with caseworker documentation
- **Error handling**: Better messaging for session failures

**Lessons Learned:**
1. **Design constraints drive architecture**: "Heads-up experience" → minimal controls → low-touch infrastructure
2. **Agentic UIs require new patterns**: Can't just copy ChatGPT
3. **Real-time streaming is hard**: Coordinate mapping, session management, mode switching
4. **Infrastructure automation pays off**: Preview cleanup, VM restart, cost control
5. **Competitive intelligence is essential**: Learn from commercial tools, specialize for our users

---

## For Kevin Meeting - Discussion Topics

**Questions to Align On:**
1. Should we focus more on infrastructure/architecture or agent/UX design?
2. Do we want live demo or just architecture walkthrough?
3. Should we mention cost optimization (cleanup automation)?
4. How technical should we go? (e.g., mention Terraform resources, CDP protocol details)

**Recommendation:**
- **Foad owns:** Architecture diagram walkthrough + real-time streaming engineering (most novel/impressive)
- **Kaylyn covers:** Frontend UX decisions + AI tool usage (Figma MCP, Cursor tips)
- **Balance:** 60% architecture/infra, 40% agent/UX

---

## Key Code References

### Architecture Files
- `docker-compose.yml` - Local dev setup
- `terraform/main.tf` - GCP provider, backend config, environment logic
- `terraform/compute.tf` - VM setup, startup scripts, firewall rules
- `terraform/cloud_run.tf` - Cloud Run services, IAM, service accounts

### Application Code
- `src/mastra/agents/web-automation-agent.ts` - Agent configuration, memory, tools
- `playwright-mcp/browser-streaming-server.js` - WebSocket server, CDP bridge
- `client/artifacts/browser/client.tsx` - Browser artifact React component
- `client/app/api/browser-ws-config/route.ts` - Runtime WebSocket config

### CI/CD
- `.github/workflows/deploy.yml` - Deploy to dev/prod
- `.github/workflows/cleanup.yml` - Destroy preview environments
- `.github/workflows/release.yml` - Semantic versioning

---

## Technical Highlights to Emphasize

1. **Novel Engineering:**
   - CDP-based browser streaming with dual control modes
   - WebSocket proxy pattern for production security
   - Terraform automation for preview environments

2. **Production-Ready Infrastructure:**
   - Auto-scaling Cloud Run for frontend
   - Isolated VMs for browser workloads
   - Automatic cleanup to control costs

3. **Sophisticated Agent Design:**
   - Multi-provider LLM support (Vertex, Gemini, OpenAI)
   - Semantic memory with pgvector
   - Autonomous progression with graceful degradation

4. **Real-World UX Challenges:**
   - Coordinate transformation for user input
   - Session continuity across navigation
   - Balance between simplicity and functionality
