
/**
 * Utility for loading and managing Google Maps API script
 */

// Google Maps API key should be retrieved from environment/secure storage
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || '';
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
 * Loads the Google Maps JavaScript API if not already loaded
 * @returns Promise that resolves when the API is loaded
 */
export const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if API key is available
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key not found. Please set VITE_GOOGLE_PLACES_API_KEY environment variable.");
      reject(new Error("Google Maps API key not configured"));
      return;
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
