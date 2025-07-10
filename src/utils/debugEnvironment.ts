import { supabase } from "@/integrations/supabase/client";

export const testEnvironmentDiagnostics = async () => {
  try {
    console.log('Testing environment diagnostics...');
    
    const { data, error } = await supabase.functions.invoke('debug-env', {
      body: { test: true }
    });
    
    if (error) {
      console.error('Debug function error:', error);
      return { success: false, error };
    }
    
    console.log('Debug function response:', data);
    return { success: true, data };
    
  } catch (err) {
    console.error('Test failed:', err);
    return { success: false, error: err };
  }
};