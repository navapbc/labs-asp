# Engineering Huddle - System Architecture Diagrams

**Purpose:** Progressive walkthrough of request flows through the system
**Presentation Strategy:** Show diagrams 1→2→3 in sequence to build understanding

---

## Diagram 1: User Request → Agent Response Flow

**Timing:** 60 seconds
**Story:** "User sends a chat message asking to navigate to a website"

```mermaid
graph TB
    User[User Browser HTTPS]

    subgraph CloudRun["Cloud Run: ai-chatbot-dev (us-central1)"]
        NextJS["Next.js Frontend :3000"]
        Proxy["API Route /api/mastra-proxy"]
    end

    subgraph VM["Compute VM: app-vm-dev (us-central1-a)"]
        subgraph Docker["Docker Network: mastra-network"]
            Mastra["Container: mastra-app :4112 Mastra Backend API"]
            PMCP["Container: playwright-mcp :8931 Browser Automation"]
        end
    end

    subgraph DB["Cloud SQL: app-dev"]
        Postgres[(PostgreSQL)]
        Tables["mastra_threads mastra_messages vectors (pgvector)"]
    end

    subgraph AI["AI Providers"]
        LLM["Vertex AI Google Gemini 2.5 Pro"]
    end

    Chrome["Chrome Browser (Playwright-managed)"]

    User -->|"1. POST /chat"| NextJS
    NextJS -->|"2. POST /api/mastra-proxy"| Proxy
    Proxy -->|"3. HTTP :4112"| Mastra
    Mastra -->|"4. HTTPS API"| LLM
    LLM -->|"5. Tool call: browser_navigate"| Mastra
    Mastra -->|"6. JSON-RPC :8931"| PMCP
    PMCP -->|"7. CDP Protocol"| Chrome
    Chrome -->|"8. Page loaded"| PMCP
    PMCP -->|"9. Response"| Mastra
    Mastra -->|"10. Stream response"| Proxy
    Proxy -->|"11. SSE stream"| NextJS
    NextJS -->|"12. Display message"| User

    Mastra -.->|"Semantic memory 150k token limit"| Postgres
    Postgres --> Tables

    Note1["Why VM? Persistent Chrome + CDP access + Resource isolation"]
    Note2["Why Proxy? CORS handling + Centralized auth + Runtime config"]
    Note3["Memory System: 150k token limit, filters tool calls, semantic recall"]

    VM -.-> Note1
    Proxy -.-> Note2
    Postgres -.-> Note3

    classDef vm fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef cloudrun fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:3px
    classDef external fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef note fill:#fff9c4,stroke:#f57f17,stroke-width:2px,stroke-dasharray: 5 5

    class VM,Docker,Mastra,PMCP vm
    class CloudRun,NextJS,Proxy cloudrun
    class DB,Postgres,Tables database
    class AI,LLM external
    class Note1,Note2,Note3 note
```

**Key Talking Points:**
- **Proxy pattern**: CORS + centralized auth for Mastra API
- **VM isolation**: Chrome needs persistent process, CDP access
- **Memory system**: 150k token limit, filters tool calls, semantic recall
- **Internal Docker network**: Fast JSON-RPC communication between containers

---

## Diagram 2: Browser Streaming to Client

**Timing:** 90 seconds
**Story:** "Chrome is now running - how do we stream it to the user's browser?"

```mermaid
graph TB
    Chrome["Chrome Browser (running on VM)"]

    subgraph VM["Compute VM: app-vm-dev"]
        subgraph Docker["Docker Network"]
            PMCP["playwright-mcp :8931 (has CDP endpoint)"]
            BStream["browser-streaming :8933 WebSocket Server"]
        end
    end

    subgraph CloudRun["Cloud Run: browser-ws-proxy-dev"]
        WSProxy["WebSocket Proxy :8080 (WSS upgrade)"]
    end

    subgraph Frontend["Cloud Run: ai-chatbot-dev"]
        NextJS["Next.js :3000"]
        WSConfig["API Route /api/browser-ws-config"]
    end

    UserBrowser["User Browser (Canvas element)"]

    Chrome -->|"CDP Protocol ws://localhost:dynamic"| BStream

    BStream -->|"1. Find Playwright CDP port (ps aux grep ms-playwright)"| PMCP
    BStream -->|"2. Connect to CDP endpoint (retry 15x)"| Chrome
    Chrome -->|"3. Page.startScreencast() JPEG 80%, 1920x1080"| BStream

    NextJS -->|"A. GET /api/browser-ws-config"| WSConfig
    WSConfig -->|"B. Return proxy URL"| NextJS
    NextJS -->|"C. WSS connect"| WSProxy
    WSProxy -->|"D. WS connect :8933"| BStream

    BStream -->|"4. Base64 frames (sessionId mapping)"| WSProxy
    WSProxy -->|"5. WSS frames"| NextJS
    NextJS -->|"6. Render on canvas"| UserBrowser

    Note1["Dev Mode: Direct ws://localhost:8933, no proxy"]
    Note2["Prod Mode: WSS via Cloud Run proxy for HTTPS"]
    Note3["CDP Discovery: Dynamic port, retry 15x @ 1.5s intervals"]
    Note4["Session Management: stop-streaming does not kill Chrome"]

    WSConfig -.-> Note1
    WSProxy -.-> Note2
    BStream -.-> Note3
    Chrome -.-> Note4

    classDef vm fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef cloudrun fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef note fill:#fff9c4,stroke:#f57f17,stroke-width:2px,stroke-dasharray: 5 5

    class VM,Docker,PMCP,BStream vm
    class CloudRun,WSProxy,Frontend,NextJS,WSConfig cloudrun
    class Note1,Note2,Note3,Note4 note
```

**Key Talking Points:**
- **CDP discovery challenge**: Playwright uses dynamic ports, requires process inspection
- **Retry logic**: 15 attempts @ 1.5s intervals to handle race conditions
- **Dev vs Prod**: Local bypasses proxy, production uses WSS for HTTPS compliance
- **Session persistence**: Stopping stream doesn't kill Chrome (agent still controls it)
- **Frame format**: Base64 JPEG at 80% quality, 1920x1080, every frame for smoothness

---

## Diagram 3: User Takeover Mode (Reverse Flow)

**Timing:** 60 seconds
**Story:** "User clicks 'Take control' - how does their input reach the browser?"

```mermaid
graph TB
    UserBrowser["User Browser (clicks canvas at x:450, y:320)"]

    subgraph Frontend["Next.js Frontend"]
        Canvas["Canvas Element (client.tsx:275-349)"]
        Transform["Coordinate Transformation • Calculate 16:9 aspect ratio • Handle letterboxing/pillarboxing • Scale: (x - offsetX) * scaleX"]
    end

    subgraph CloudRun["Cloud Run: browser-ws-proxy"]
        WSProxy["WebSocket Proxy :8080"]
    end

    subgraph VM["Compute VM: app-vm-dev"]
        subgraph Docker["Docker Network"]
            BStream["browser-streaming :8933"]
            ControlMode["Control Mode State 'agent' | 'user'"]
        end
    end

    Chrome["Chrome Browser"]

    UserBrowser -->|"1. Canvas click event"| Canvas
    Canvas -->|"2. Calculate coordinates renderedWidth, offsetX/Y"| Transform
    Transform -->|"3. WSS message {type: 'user-input', x: 823, y: 584}"| WSProxy
    WSProxy -->|"4. WS downgrade"| BStream
    BStream -->|"5. Check controlMode === 'user'"| ControlMode
    ControlMode -->|"6. Approved"| BStream
    BStream -->|"7. CDP Input.dispatchMouseEvent mouseMoved → mousePressed → mouseReleased"| Chrome
    Chrome -->|"8. Element clicked"| Chrome
    Chrome -->|"9. New screencast frame"| BStream
    BStream -->|"10. Frame update"| WSProxy
    WSProxy -->|"11. Visual feedback"| UserBrowser

    Note1["Coordinate Transform: Canvas 1920x1080 scaled to screen size, handles letterboxing"]
    Note2["Control Modes: agent (default) or user, switch without dropping WS"]
    Note3["Input Types: click, mousemove (50ms throttle), keydown/keyup, scroll"]
    Note4["Session Continuity: Fullscreen on takeover, Escape to exit, state persists"]

    Transform -.-> Note1
    ControlMode -.-> Note2
    BStream -.-> Note3
    Chrome -.-> Note4

    classDef frontend fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef vm fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef note fill:#fff9c4,stroke:#f57f17,stroke-width:2px,stroke-dasharray: 5 5

    class Frontend,Canvas,Transform,CloudRun,WSProxy frontend
    class VM,Docker,BStream,ControlMode vm
    class Note1,Note2,Note3,Note4 note
```

**Key Talking Points:**
- **Coordinate transformation**: Canvas size ≠ viewport size, requires aspect ratio math
- **Letterboxing handling**: 16:9 video in arbitrary canvas, ignore clicks in black bars
- **Control mode switching**: Agent vs user mode, no WS disconnect, server-side state
- **Input throttling**: Mousemove events limited to 50ms intervals to avoid flooding
- **Session continuity**: Takeover → fullscreen, Escape to exit, state persists

---

## Optional: Database Schema Overview

**If time permits (30 seconds)**

```mermaid
graph TB
    subgraph CloudSQL["Cloud SQL PostgreSQL: app-dev"]
        subgraph ChatSchema["Chat SDK Tables"]
            Users["users (auth data)"]
            Chats["chats (sessions)"]
            Messages["messages (chat history)"]
            Docs["documents (browser session IDs)"]
        end

        subgraph MastraSchema["Mastra Agent Tables"]
            Threads["mastra_threads (conversation context)"]
            MMessages["mastra_messages (agent memory)"]
            Vectors["vectors (pgvector embeddings)"]
        end
    end

    NextJS["Next.js (Cloud Run)"]
    Mastra["mastra-app (VM)"]

    NextJS -->|"Cloud SQL Proxy"| ChatSchema
    Mastra -->|"TCP :5432"| MastraSchema
    Mastra -.->|"Semantic recall topK: 5"| Vectors

    Note1["Chat SDK: User data, Mastra: Agent memory, pgvector: Semantic search"]

    Vectors -.-> Note1

    classDef database fill:#e8f5e8,stroke:#1b5e20,stroke-width:3px
    classDef note fill:#fff9c4,stroke:#f57f17,stroke-width:2px,stroke-dasharray: 5 5

    class CloudSQL,ChatSchema,MastraSchema,Users,Chats,Messages,Docs,Threads,MMessages,Vectors database
    class Note1 note
```

---

## Presentation Strategy

### Slide Progression (3-4 minutes total)

1. **Intro Slide** (15 sec)
   - "We built a real-time browser automation platform with AI agent control and human takeover"
   - "Let's walk through how a user request flows through the system"

2. **Diagram 1** (60 sec)
   - "User sends chat message → Agent navigates browser"
   - Highlight: VM isolation, proxy pattern, memory system
   - Key insight: Docker internal network for fast tool calls

3. **Diagram 2** (90 sec)
   - "Chrome is running, now stream it to the user"
   - Highlight: CDP discovery, retry logic, WSS proxy pattern
   - Key insight: Dev vs prod modes, session persistence

4. **Diagram 3** (60 sec)
   - "User takes control, clicks on browser"
   - Highlight: Coordinate transformation, control mode state
   - Key insight: Session continuity, input throttling

5. **Optional: Database Schema** (30 sec)
   - "How we manage chat history vs agent memory"
   - Highlight: Separation of concerns, pgvector for semantic recall

6. **Conclusion** (15 sec)
   - "Key challenges: CDP discovery, coordinate mapping, session management"
   - "Novel patterns: WSS proxy, dual control modes, memory filtering"

---

## Technical Annotations Summary

**Infrastructure Decisions:**
- VM for Chrome isolation + CDP access
- Cloud Run for auto-scaling frontend + WSS upgrade
- Docker network for fast inter-container communication

**Streaming Challenges:**
- CDP port discovery via process inspection
- 15-attempt retry logic for race conditions
- Base64 JPEG frames at 80% quality, 1920x1080

**User Input Challenges:**
- Coordinate transformation for aspect ratio handling
- Letterboxing/pillarboxing detection
- Input throttling (mousemove @ 50ms)
- Control mode state management

**Session Management:**
- Stop streaming ≠ kill Chrome
- WebSocket disconnect preserves browser state
- Session IDs map to browser instances
- Agent can continue working after stream stops
