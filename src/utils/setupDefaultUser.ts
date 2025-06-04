
import { supabase } from '@/integrations/supabase/client';
import { generateSecurePassword } from './securePassword';

/**
 * Setup a secure default admin user for development/demo purposes
 * This replaces the hardcoded credentials approach
 */
export const setupSecureDefaultUser = async () => {
  try {
    // Check if we're in development mode
    const isDevelopment = import.meta.env.DEV;
    
    if (!isDevelopment) {
      console.log('Skipping default user setup in production');
      return;
    }

    // Check if default user already exists
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'admin@demo.com')
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('Default admin user already exists');
      return;
    }

    // Generate a secure password for the demo admin
    const securePassword = generateSecurePassword(16, true);
    
    console.log('='.repeat(60));
    console.log('🚀 DEVELOPMENT DEMO CREDENTIALS');
    console.log('='.repeat(60));
    console.log('Email: admin@demo.com');
    console.log('Password:', securePassword);
    console.log('Role: Super Admin');
    console.log('='.repeat(60));
    console.log('⚠️  Save these credentials - they will only be shown once!');
    console.log('='.repeat(60));

    // Create the demo admin user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@demo.com',
      password: securePassword,
      options: {
        data: {
          name: 'Demo Admin',
          role: 'super_admin'
        }
      }
    });

    if (authError) {
      console.error('Failed to create demo admin user:', authError);
      return;
    }

    console.log('✅ Demo admin user created successfully');
    
  } catch (error) {
    console.error('Error setting up default user:', error);
  }
};
