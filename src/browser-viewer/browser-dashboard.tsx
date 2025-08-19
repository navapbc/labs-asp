/**
 * Browser Dashboard Component
 * React component for managing and viewing browser instances
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserViewer, BrowserInstanceManager, BrowserInstance } from './browser-viewer';

interface BrowserDashboardProps {
  endpoint: string;
  className?: string;
}

interface ViewerTab {
  id: string;
  instanceId: string;
  title: string;
  viewer: BrowserViewer | null;
  mode: 'vnc' | 'webrtc' | 'screenshots' | 'dom-mirror';
}

export const BrowserDashboard: React.FC<BrowserDashboardProps> = ({ 
  endpoint, 
  className = '' 
}) => {
  const [instances, setInstances] = useState<BrowserInstance[]>([]);
  const [viewerTabs, setViewerTabs] = useState<ViewerTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  
  const instanceManager = useRef(new BrowserInstanceManager(endpoint));
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInstances();
    const interval = setInterval(loadInstances, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadInstances = async () => {
    try {
      const instanceList = await instanceManager.current.listInstances();
      setInstances(instanceList);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load instances:', error);
      setIsLoading(false);
    }
  };

  const createNewInstance = async () => {
    try {
      setIsLoading(true);
      const newInstance = await instanceManager.current.createInstance();
      setInstances(prev => [...prev, newInstance]);
      
      // Automatically open a viewer for the new instance
      openViewer(newInstance.id, 'screenshots');
    } catch (error) {
      console.error('Failed to create instance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInstance = async (instanceId: string) => {
    try {
      await instanceManager.current.deleteInstance(instanceId);
      setInstances(prev => prev.filter(i => i.id !== instanceId));
      
      // Close any open viewers for this instance
      setViewerTabs(prev => {
        const filtered = prev.filter(tab => tab.instanceId !== instanceId);
        if (activeTab && !filtered.find(t => t.id === activeTab)) {
          setActiveTab(filtered.length > 0 ? filtered[0].id : null);
        }
        return filtered;
      });
    } catch (error) {
      console.error('Failed to delete instance:', error);
    }
  };

  const openViewer = (instanceId: string, mode: ViewerTab['mode']) => {
    const tabId = `${instanceId}-${mode}`;
    const existingTab = viewerTabs.find(tab => tab.id === tabId);
    
    if (existingTab) {
      setActiveTab(tabId);
      return;
    }

    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return;

    const newTab: ViewerTab = {
      id: tabId,
      instanceId,
      title: `${instance.id.slice(0, 8)} (${mode})`,
      viewer: null,
      mode
    };

    setViewerTabs(prev => [...prev, newTab]);
    setActiveTab(tabId);
  };

  const closeViewer = (tabId: string) => {
    const tab = viewerTabs.find(t => t.id === tabId);
    if (tab?.viewer) {
      tab.viewer.disconnect();
    }

    setViewerTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTab === tabId) {
        setActiveTab(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Initialize viewer when tab becomes active
  useEffect(() => {
    if (!activeTab || !viewerContainerRef.current) return;

    const tab = viewerTabs.find(t => t.id === activeTab);
    if (!tab || tab.viewer) return;

    // Clear container
    viewerContainerRef.current.innerHTML = '';

    // Create new viewer
    const viewer = new BrowserViewer(viewerContainerRef.current, {
      mode: tab.mode,
      endpoint: `${endpoint}/instances/${tab.instanceId}`,
      instanceId: tab.instanceId,
      enableInteraction: true,
      quality: 'medium'
    });

    // Listen for connection state changes
    viewerContainerRef.current.addEventListener('connectionStateChange', (event: any) => {
      setConnectionStatus(event.detail.state);
    });

    // Update tab with viewer instance
    setViewerTabs(prev => 
      prev.map(t => t.id === activeTab ? { ...t, viewer } : t)
    );
  }, [activeTab, viewerTabs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'busy': return 'text-yellow-600';
      case 'idle': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className={`browser-dashboard ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Browser Instances</h2>
        <div className="flex items-center space-x-4">
          <span className={`text-sm ${getConnectionStatusColor(connectionStatus)}`}>
            {connectionStatus}
          </span>
          <button
            onClick={createNewInstance}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'New Instance'}
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar - Instance List */}
        <div className="w-64 border-r bg-gray-50 p-4">
          <h3 className="font-medium mb-3">Active Instances</h3>
          {instances.length === 0 ? (
            <p className="text-gray-500 text-sm">No instances running</p>
          ) : (
            <div className="space-y-2">
              {instances.map(instance => (
                <div key={instance.id} className="border rounded p-3 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-sm">{instance.id.slice(0, 8)}</span>
                    <span className={`text-xs ${getStatusColor(instance.status)}`}>
                      {instance.status}
                    </span>
                  </div>
                  
                  {instance.currentUrl && (
                    <p className="text-xs text-gray-600 mb-2 truncate">
                      {instance.currentUrl}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {(['screenshots', 'vnc', 'webrtc', 'dom-mirror'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => openViewer(instance.id, mode)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                      >
                        {mode}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => deleteInstance(instance.id)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content - Viewer Tabs */}
        <div className="flex-1 flex flex-col">
          {/* Viewer Tabs */}
          {viewerTabs.length > 0 && (
            <div className="flex border-b">
              {viewerTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`px-4 py-2 cursor-pointer border-r flex items-center space-x-2 ${
                    activeTab === tab.id ? 'bg-blue-50 border-b-2 border-blue-600' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="text-sm">{tab.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeViewer(tab.id);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Viewer Container */}
          <div className="flex-1 relative">
            {viewerTabs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="mb-2">No browser viewers open</p>
                  <p className="text-sm">Create an instance and open a viewer to get started</p>
                </div>
              </div>
            ) : (
              <div
                ref={viewerContainerRef}
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Agent Control Panel */}
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-medium">Agent Controls</h3>
            <select className="text-sm border rounded px-2 py-1">
              <option>Web Automation Agent</option>
              <option>Data Extraction Agent</option>
              <option>Testing Agent</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              Start Agent
            </button>
            <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Stop Agent
            </button>
            <button className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
              Debug Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserDashboard;
