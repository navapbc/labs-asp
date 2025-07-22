import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { mcp } from '../mcp';

// Get EXA tools from MCP
const exaTools = await mcp.getTools();

// Service/Program Research Tool - for finding government services, programs, applications
export const serviceResearchTool = createTool({
  id: 'research-service-program',
  description: 'Research government services, programs, or applications in specific locations (e.g., MISP in Riverside County, unemployment benefits in California)',
  inputSchema: z.object({
    serviceName: z.string().describe('Name of the service, program, or application to research'),
    location: z.string().describe('Location/jurisdiction (e.g., "Riverside County", "California", "New York City")'),
    specificInfo: z.string().optional().describe('Specific information needed (e.g., "application process", "eligibility requirements", "contact information")'),
  }),
  outputSchema: z.object({
    serviceName: z.string(),
    location: z.string(),
    description: z.string(),
    applicationProcess: z.string(),
    eligibilityRequirements: z.string().optional(),
    contactInfo: z.string().optional(),
    websites: z.array(z.string()).optional(),
    additionalNotes: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const searchQuery = `${context.serviceName} ${context.location} ${context.specificInfo || 'application process requirements'}`;
    
    // Use EXA search tool
    const searchResult = await exaTools.exa_web_search_exa.execute({
      context: {
        query: searchQuery,
        num_results: 5,
        search_type: 'auto',
        include_domains: [],
        exclude_domains: [],
        start_crawl_date: '',
        end_crawl_date: '',
        start_published_date: '',
        end_published_date: '',
        use_autoprompt: true,
      }
    });

    // Process and structure the search results
    const results = searchResult.results || [];
    const mainResult = results[0] || {};
    
    return {
      serviceName: context.serviceName,
      location: context.location,
      description: mainResult.text || `Information about ${context.serviceName} in ${context.location}`,
      applicationProcess: extractApplicationInfo(searchResult, 'application', 'apply', 'process'),
      eligibilityRequirements: extractApplicationInfo(searchResult, 'eligibility', 'requirements', 'qualify'),
      contactInfo: extractApplicationInfo(searchResult, 'contact', 'phone', 'address', 'office'),
      websites: results.map((r: any) => r.url).filter(Boolean),
      additionalNotes: extractApplicationInfo(searchResult, 'hours', 'documents', 'forms'),
    };
  },
});

// Website/Organization Research Tool - for understanding organizations before visiting their sites
export const organizationResearchTool = createTool({
  id: 'research-organization',
  description: 'Research an organization or website to understand their services, structure, and how to navigate their systems',
  inputSchema: z.object({
    organizationName: z.string().describe('Name of the organization or website'),
    focusArea: z.string().optional().describe('Specific area of interest (e.g., "customer service", "application process", "services offered")'),
  }),
  outputSchema: z.object({
    organizationName: z.string(),
    description: z.string(),
    services: z.array(z.string()),
    navigationTips: z.array(z.string()),
    commonProcesses: z.array(z.string()),
    contactMethods: z.array(z.string()),
    websites: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const searchQuery = `${context.organizationName} ${context.focusArea || 'services navigation'} official website`;
    
    const searchResult = await exaTools.exa_web_search_exa.execute({
      context: {
        query: searchQuery,
        num_results: 5,
        search_type: 'auto',
        include_domains: [],
        exclude_domains: [],
        start_crawl_date: '',
        end_crawl_date: '',
        start_published_date: '',
        end_published_date: '',
        use_autoprompt: true,
      }
    });

    const results = searchResult.results || [];
    
    return {
      organizationName: context.organizationName,
      description: extractOrganizationInfo(searchResult, 'about', 'mission', 'overview'),
      services: extractListInfo(searchResult, 'services', 'programs', 'offerings'),
      navigationTips: extractListInfo(searchResult, 'how to', 'navigate', 'steps'),
      commonProcesses: extractListInfo(searchResult, 'application', 'registration', 'enrollment'),
      contactMethods: extractListInfo(searchResult, 'contact', 'phone', 'email', 'support'),
      websites: results.map((r: any) => r.url).filter(Boolean),
    };
  },
});

// Process Research Tool - for understanding specific processes before automating them
export const processResearchTool = createTool({
  id: 'research-process',
  description: 'Research a specific process or procedure to understand steps, requirements, and potential automation points',
  inputSchema: z.object({
    processName: z.string().describe('Name of the process to research (e.g., "applying for unemployment benefits", "registering for health insurance")'),
    context: z.string().optional().describe('Additional context or location (e.g., "California", "online process")'),
  }),
  outputSchema: z.object({
    processName: z.string(),
    steps: z.array(z.string()),
    requirements: z.array(z.string()),
    timeframe: z.string().optional(),
    documentsNeeded: z.array(z.string()),
    tips: z.array(z.string()),
    commonIssues: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const searchQuery = `"${context.processName}" ${context.context || ''} steps requirements how to guide`;
    
    const searchResult = await exaTools.exa_web_search_exa.execute({
      context: {
        query: searchQuery,
        num_results: 5,
        search_type: 'auto',
        include_domains: [],
        exclude_domains: [],
        start_crawl_date: '',
        end_crawl_date: '',
        start_published_date: '',
        end_published_date: '',
        use_autoprompt: true,
      }
    });

    return {
      processName: context.processName,
      steps: extractListInfo(searchResult, 'step', 'steps', 'process', 'procedure'),
      requirements: extractListInfo(searchResult, 'require', 'requirement', 'need', 'must'),
      timeframe: extractApplicationInfo(searchResult, 'time', 'days', 'weeks', 'processing'),
      documentsNeeded: extractListInfo(searchResult, 'document', 'form', 'ID', 'proof'),
      tips: extractListInfo(searchResult, 'tip', 'recommend', 'suggest', 'advice'),
      commonIssues: extractListInfo(searchResult, 'issue', 'problem', 'error', 'troubleshoot'),
    };
  },
});

// Quick Web Search Tool - for general research during automation
export const quickWebSearchTool = createTool({
  id: 'quick-web-search',
  description: 'Perform a quick web search to clarify terms, find additional information, or verify details during web automation',
  inputSchema: z.object({
    query: z.string().describe('Search query'),
    numResults: z.number().optional().default(3).describe('Number of results to return (1-10)'),
  }),
  outputSchema: z.object({
    query: z.string(),
    summary: z.string(),
    keyFindings: z.array(z.string()),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    const searchResult = await exaTools.exa_web_search_exa.execute({
      context: {
        query: context.query,
        num_results: Math.min(Math.max(context.numResults || 3, 1), 10),
        search_type: 'auto',
        include_domains: [],
        exclude_domains: [],
        start_crawl_date: '',
        end_crawl_date: '',
        start_published_date: '',
        end_published_date: '',
        use_autoprompt: true,
      }
    });

    const results = searchResult.results || [];
    
    return {
      query: context.query,
      summary: results[0]?.text || `Search results for: ${context.query}`,
      keyFindings: extractListInfo(searchResult, 'key', 'important', 'main', 'primary').slice(0, 5),
      sources: results.map((r: any) => ({
        title: r.title || 'No title',
        url: r.url || '',
        snippet: r.text?.substring(0, 200) + '...' || 'No snippet available',
      })),
    };
  },
});

// Helper functions to extract specific information from search results
function extractApplicationInfo(searchResult: any, ...keywords: string[]): string {
  const results = searchResult.results || [];
  const allText = results.map((r: any) => r.text || '').join(' ').toLowerCase();
  
  for (const keyword of keywords) {
    const regex = new RegExp(`[^.]*${keyword}[^.]*\\.`, 'gi');
    const matches = allText.match(regex);
    if (matches && matches.length > 0) {
      return matches[0].trim().replace(/^./, (c: string) => c.toUpperCase());
    }
  }
  
  return '';
}

function extractOrganizationInfo(searchResult: any, ...keywords: string[]): string {
  const results = searchResult.results || [];
  for (const result of results) {
    const text = result.text || '';
    for (const keyword of keywords) {
      if (text.toLowerCase().includes(keyword)) {
        // Extract a paragraph containing the keyword
        const sentences = text.split('. ');
        const relevantSentence = sentences.find((s: string) => s.toLowerCase().includes(keyword));
        if (relevantSentence) {
          return relevantSentence.trim() + '.';
        }
      }
    }
  }
  return `Information about ${searchResult.query || 'the organization'}`;
}

function extractListInfo(searchResult: any, ...keywords: string[]): string[] {
  const results = searchResult.results || [];
  const allText = results.map((r: any) => r.text || '').join(' ');
  const items: string[] = [];
  
  // Look for numbered lists, bullet points, or structured information
  const patterns = [
    /(\d+\.\s+[^.\n]*)/g,
    /([•▪▫-]\s+[^.\n]*)/g,
    /([A-Z][^.]*(?:step|requirement|document|tip)[^.]*\.)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = allText.match(pattern);
    if (matches) {
      items.push(...matches.map((m: string) => m.trim().replace(/^\d+\.\s*|^[•▪▫-]\s*/, '')));
    }
  }
  
  // Filter for items containing our keywords
  const filtered = items.filter(item => 
    keywords.some(keyword => item.toLowerCase().includes(keyword))
  );
  
  return filtered.slice(0, 10); // Limit to top 10 items
} 