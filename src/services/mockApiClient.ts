
/**
 * Helper functions for intercepting API requests during development and showing mock data
 */

type ApiResponseHandler = (data: any) => void;

interface ApiRequest {
  url: string;
  options: RequestInit;
  resolve: (value: Response) => void;
  reject: (reason?: any) => void;
}

// Store API requests that are in progress
const pendingRequests: Record<string, ApiRequest> = {};

// Listen for API responses from the iframe mock API handlers
window.addEventListener('message', (event) => {
  if (event.data?.type === 'apiResponse') {
    const { status, data, url } = event.data;
    
    // Find the pending request for this URL
    const requestKey = Object.keys(pendingRequests).find(key => 
      key.includes(url || 'api/')
    );
    
    if (requestKey && pendingRequests[requestKey]) {
      const request = pendingRequests[requestKey];
      
      // Create a mock Response object
      const mockResponse = new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Resolve the pending request with the mock response
      request.resolve(mockResponse);
      
      // Remove the request from pending requests
      delete pendingRequests[requestKey];
    }
  }
});

/**
 * Intercepts a fetch request and returns a mocked response during development
 * @param url The URL to fetch
 * @param options The fetch options
 * @returns A promise that resolves to a Response object
 */
export async function mockApiClient(url: string, options: RequestInit = {}): Promise<Response> {
  // Check if the URL is an API route that we want to mock
  if (url.startsWith('/api/')) {
    console.log('Intercepting API request:', url, options);
    
    // Create a unique key for this request
    const requestKey = `${url}-${Date.now()}`;
    
    // Return a promise that will be resolved when the mock API responds
    return new Promise<Response>((resolve, reject) => {
      // Store the request details
      pendingRequests[requestKey] = {
        url,
        options,
        resolve,
        reject
      };
      
      // Create an iframe to handle the request
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);
      
      // Remove the iframe after a short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    });
  }
  
  // For non-API routes, use the regular fetch
  return fetch(url, options);
}

// Optional: Replace global fetch with the mock client during development
if (process.env.NODE_ENV === 'development') {
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    // Fix: Handle different input types correctly
    const url = typeof input === 'string' 
      ? input 
      : input instanceof Request 
        ? input.url 
        : input.toString();
    
    if (url.startsWith('/api/')) {
      return mockApiClient(url, init);
    }
    
    return originalFetch(input, init);
  };
}
