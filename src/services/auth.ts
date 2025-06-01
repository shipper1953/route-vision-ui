import { supabase } from "@/integrations/supabase/client";

interface LoginResponse {
  user: any;
  session: any;
  error?: string;
}

export const auth = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  },
};