/**
 * Browser-in-Browser Viewer Component
 * Provides multiple methods to view and interact with remote browser instances
 */

export interface BrowserViewerOptions {
  mode: 'vnc' | 'webrtc' | 'screenshots' | 'dom-mirror';
  endpoint: string;
  instanceId?: string;
  quality?: 'low' | 'medium' | 'high';
  enableInteraction?: boolean;
}

export interface BrowserInstance {
  id: string;
  status: 'active' | 'idle' | 'busy';
  currentUrl?: string;
  lastActivity: Date;
  capabilities: string[];
}

export class BrowserViewer {
  private container: HTMLElement;
  private options: BrowserViewerOptions;
  private connection: WebSocket | RTCPeerConnection | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private iframe: HTMLIFrameElement | null = null;

  constructor(container: HTMLElement, options: BrowserViewerOptions) {
    this.container = container;
    this.options = options;
    this.initializeViewer();
  }

  private initializeViewer() {
    switch (this.options.mode) {
      case 'vnc':
        this.initializeVNCViewer();
        break;
      case 'webrtc':
        this.initializeWebRTCViewer();
        break;
      case 'screenshots':
        this.initializeScreenshotViewer();
        break;
      case 'dom-mirror':
        this.initializeDOMMirrorViewer();
        break;
    }
  }

  /**
   * VNC Viewer - Most compatible, works everywhere
   */
  private initializeVNCViewer() {
    // Use noVNC client for web-based VNC viewing
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.border = '1px solid #ccc';
    this.container.appendChild(canvas);
    this.canvas = canvas;

    // Initialize noVNC connection
    this.connection = new WebSocket(`${this.options.endpoint}/vnc`);
    this.connection.onopen = () => {
      console.log('VNC connection established');
      this.setupVNCClient();
    };
  }

  private setupVNCClient() {
    // This would integrate with noVNC library
    // For now, showing the structure
    const vncClient = {
      connect: () => {
        console.log('Connecting to VNC server...');
      },
      onUpdateState: (state: string) => {
        this.onConnectionStateChange(state);
      }
    };
    
    vncClient.connect();
  }

  /**
   * WebRTC Viewer - Best performance, lowest latency
   */
  private initializeWebRTCViewer() {
    const video = document.createElement('video');
    video.style.width = '100%';
    video.style.height = '100%';
    video.autoplay = true;
    video.controls = false;
    this.container.appendChild(video);

    // WebRTC peer connection setup
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (event) => {
      video.srcObject = event.streams[0];
    };

    // WebSocket for signaling
    this.connection = new WebSocket(`${this.options.endpoint}/webrtc-signaling`);
    this.connection.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await this.handleWebRTCSignaling(pc, data);
    };

    this.connection = pc;
  }

  private async handleWebRTCSignaling(pc: RTCPeerConnection, data: any) {
    switch (data.type) {
      case 'offer':
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.sendSignalingMessage({ type: 'answer', answer });
        break;
      case 'ice-candidate':
        await pc.addIceCandidate(data.candidate);
        break;
    }
  }

  /**
   * Screenshot Viewer - Simple HTTP streaming
   */
  private initializeScreenshotViewer() {
    const img = document.createElement('img');
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.border = '1px solid #ccc';
    this.container.appendChild(img);

    // Poll for screenshots
    this.startScreenshotPolling(img);
  }

  private startScreenshotPolling(img: HTMLImageElement) {
    const pollInterval = this.options.quality === 'high' ? 100 : 500; // ms
    
    const updateScreenshot = async () => {
      try {
        const response = await fetch(`${this.options.endpoint}/screenshot?t=${Date.now()}`);
        if (response.ok) {
          const blob = await response.blob();
          img.src = URL.createObjectURL(blob);
        }
      } catch (error) {
        console.error('Screenshot update failed:', error);
      }
      
      setTimeout(updateScreenshot, pollInterval);
    };

    updateScreenshot();
  }

  /**
   * DOM Mirror Viewer - Synchronized DOM representation
   */
  private initializeDOMMirrorViewer() {
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '1px solid #ccc';
    iframe.sandbox = 'allow-scripts allow-same-origin';
    this.container.appendChild(iframe);
    this.iframe = iframe;

    // WebSocket for DOM synchronization
    this.connection = new WebSocket(`${this.options.endpoint}/dom-sync`);
    this.connection.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.updateMirroredDOM(data);
    };
  }

  private updateMirroredDOM(data: any) {
    if (!this.iframe?.contentDocument) return;

    switch (data.type) {
      case 'full-dom':
        this.iframe.contentDocument.documentElement.innerHTML = data.html;
        break;
      case 'dom-mutation':
        this.applyDOMMutation(data.mutation);
        break;
      case 'style-update':
        this.updateStyles(data.styles);
        break;
    }
  }

  /**
   * Interaction Methods
   */
  public async sendClick(x: number, y: number) {
    if (!this.options.enableInteraction) return;

    const interaction = {
      type: 'click',
      coordinates: { x, y },
      instanceId: this.options.instanceId
    };

    await this.sendInteraction(interaction);
  }

  public async sendKeypress(key: string) {
    if (!this.options.enableInteraction) return;

    const interaction = {
      type: 'keypress',
      key,
      instanceId: this.options.instanceId
    };

    await this.sendInteraction(interaction);
  }

  public async sendScroll(deltaX: number, deltaY: number) {
    if (!this.options.enableInteraction) return;

    const interaction = {
      type: 'scroll',
      delta: { x: deltaX, y: deltaY },
      instanceId: this.options.instanceId
    };

    await this.sendInteraction(interaction);
  }

  private async sendInteraction(interaction: any) {
    try {
      await fetch(`${this.options.endpoint}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(interaction)
      });
    } catch (error) {
      console.error('Interaction failed:', error);
    }
  }

  private sendSignalingMessage(message: any) {
    if (this.connection instanceof WebSocket) {
      this.connection.send(JSON.stringify(message));
    }
  }

  private onConnectionStateChange(state: string) {
    console.log('Browser viewer connection state:', state);
    // Emit events for UI updates
    this.container.dispatchEvent(new CustomEvent('connectionStateChange', {
      detail: { state }
    }));
  }

  private applyDOMMutation(mutation: any) {
    // Implementation for applying DOM mutations
    console.log('Applying DOM mutation:', mutation);
  }

  private updateStyles(styles: any) {
    // Implementation for updating styles
    console.log('Updating styles:', styles);
  }

  public disconnect() {
    if (this.connection) {
      if (this.connection instanceof WebSocket) {
        this.connection.close();
      } else if (this.connection instanceof RTCPeerConnection) {
        this.connection.close();
      }
      this.connection = null;
    }
  }
}

/**
 * Browser Instance Manager
 */
export class BrowserInstanceManager {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async listInstances(): Promise<BrowserInstance[]> {
    const response = await fetch(`${this.endpoint}/instances`);
    return response.json();
  }

  async createInstance(): Promise<BrowserInstance> {
    const response = await fetch(`${this.endpoint}/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'chrome' })
    });
    return response.json();
  }

  async deleteInstance(instanceId: string): Promise<void> {
    await fetch(`${this.endpoint}/instances/${instanceId}`, {
      method: 'DELETE'
    });
  }

  async getInstanceStatus(instanceId: string): Promise<BrowserInstance> {
    const response = await fetch(`${this.endpoint}/instances/${instanceId}`);
    return response.json();
  }
}

/**
 * Usage Examples
 */

// Example 1: VNC Viewer with interaction
export function createVNCViewer(container: HTMLElement, endpoint: string) {
  return new BrowserViewer(container, {
    mode: 'vnc',
    endpoint,
    enableInteraction: true,
    quality: 'medium'
  });
}

// Example 2: WebRTC Viewer for real-time monitoring
export function createWebRTCViewer(container: HTMLElement, endpoint: string) {
  return new BrowserViewer(container, {
    mode: 'webrtc',
    endpoint,
    enableInteraction: false,
    quality: 'high'
  });
}

// Example 3: Screenshot viewer for debugging
export function createScreenshotViewer(container: HTMLElement, endpoint: string) {
  return new BrowserViewer(container, {
    mode: 'screenshots',
    endpoint,
    enableInteraction: true,
    quality: 'low'
  });
}
