
/**
 * Utility for loading and managing Google Maps API script
 */

// Google Maps API key will be fetched from Supabase edge function
let GOOGLE_MAPS_API_KEY = '';
const SCRIPT_ID = 'google-maps-script';

declare global {
  interface Window {
    google: typeof google;
    initGooglePlaces: () => void;
    googleMapsScriptLoaded: boolean;
    googleMapsLoading: boolean;
  }
}

/**
 * Fetches the Google Maps API key from Supabase edge function
 */
const fetchGoogleApiKey = async (): Promise<string> => {
  try {
    // Import supabase client dynamically to avoid issues
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('get-google-api-key', {
      method: 'GET'
    });

    if (error) {
      throw new Error(error.message || 'Failed to get API key');
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (!data?.apiKey) {
      throw new Error('No API key returned');
    }

    return data.apiKey;
  } catch (error) {
    console.error('Failed to fetch Google API key:', error);
    throw error;
  }
};

/**
 * Loads the Google Maps JavaScript API if not already loaded
 * @returns Promise that resolves when the API is loaded
 */
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    // Fetch API key first if we don't have it
    if (!GOOGLE_MAPS_API_KEY) {
      try {
        GOOGLE_MAPS_API_KEY = await fetchGoogleApiKey();
      } catch (error) {
        console.error("Failed to get Google Maps API key:", error);
        reject(new Error("Google Maps API key not available"));
        return;
      }
    }
    // If script already exists or is loading, handle appropriately
    if (document.getElementById(SCRIPT_ID)) {
      console.log("Google Maps script already exists in DOM");
      if (window.googleMapsScriptLoaded) {
        resolve();
      } else {
        // Wait for the existing script to load
        const checkLoaded = setInterval(() => {
          if (window.googleMapsScriptLoaded) {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 100);
        
        // Set a timeout for the check
        setTimeout(() => {
          clearInterval(checkLoaded);
          reject(new Error("Timeout waiting for Google Maps to load"));
        }, 10000);
      }
      return;
    }
    
    if (window.googleMapsLoading) {
      console.log("Google Maps script is already loading");
      // Wait for the current loading to complete
      const checkLoaded = setInterval(() => {
        if (window.googleMapsScriptLoaded) {
          clearInterval(checkLoaded);
          resolve();
        }
      }, 100);
      
      // Set a timeout for the check
      setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error("Timeout waiting for Google Maps to load"));
      }, 10000);
      return;
    }
    
    if (window.googleMapsScriptLoaded) {
      console.log("Google Maps API already loaded");
      resolve();
      return;
    }
    
    window.googleMapsLoading = true;
    
    // Define global callback
    window.initGooglePlaces = () => {
      window.googleMapsLoading = false;
      window.googleMapsScriptLoaded = true;
      console.log("Google Maps API loaded successfully");
      resolve();
    };
    
    // Create and append script
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGooglePlaces&v=weekly&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      window.googleMapsLoading = false;
      console.error("Google Maps API script failed to load", e);
      reject(new Error("Failed to load Google Maps API"));
    };
    
    document.body.appendChild(script);
  });
};

/**
 * Checks if Google Maps API is loaded and ready to use
 */
export const isGoogleMapsLoaded = (): boolean => {
  return !!window.google && !!window.google.maps && !!window.google.maps.places;
};
