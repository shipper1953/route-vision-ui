
import { supabase } from "@/integrations/supabase/client";

export const createDefaultAdminUser = async () => {
  const defaultEmail = "admin@test.com";
  const defaultPassword = "ShipTornado123!";
  
  try {
    console.log("Checking if any users exist...");
    
    // Instead of creating a user automatically, just check if any users exist
    // This avoids the email validation errors we're seeing
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('email')
      .limit(1);
    
    if (fetchError) {
      console.log("Cannot check users table:", fetchError.message);
      throw fetchError;
    }
    
    if (existingUsers && existingUsers.length > 0) {
      console.log("Users already exist in the system");
      return { email: defaultEmail, password: defaultPassword, exists: true };
    }
    
    console.log("No users found - manual user creation required");
    // Don't attempt automatic creation, just return suggested credentials
    return { email: defaultEmail, password: defaultPassword, exists: false };
    
  } catch (error) {
    console.error("Error in createDefaultAdminUser:", error);
    throw error;
  }
};
