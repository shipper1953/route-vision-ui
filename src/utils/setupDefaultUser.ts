
import { supabase } from "@/integrations/supabase/client";

export const createDefaultAdminUser = async () => {
  const defaultEmail = "admin@shiptornado.dev";
  const defaultPassword = "ShipTornado123!";
  
  try {
    console.log("Checking if default admin user exists...");
    
    // Check if user already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', defaultEmail);
    
    if (existingUsers && existingUsers.length > 0) {
      console.log("Default admin user already exists");
      return { email: defaultEmail, password: defaultPassword, exists: true };
    }
    
    console.log("Creating default admin user...");
    
    // Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: defaultEmail,
      password: defaultPassword,
      options: {
        data: {
          name: "Default Admin",
          role: "admin"
        }
      }
    });
    
    if (authError) {
      console.error("Error creating auth user:", authError);
      throw authError;
    }
    
    if (authData.user) {
      // Insert into users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: "Default Admin",
          email: defaultEmail,
          role: "admin",
          password: "" // Password is managed by Supabase Auth
        });
      
      if (userError) {
        console.error("Error creating user profile:", userError);
        throw userError;
      }
      
      console.log("Default admin user created successfully");
      return { email: defaultEmail, password: defaultPassword, exists: false };
    }
    
    throw new Error("Failed to create user");
  } catch (error) {
    console.error("Error in createDefaultAdminUser:", error);
    throw error;
  }
};
