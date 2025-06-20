
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'company_admin' | 'user' | 'super_admin';
  sendInvitation: boolean;
}

export const useCreateUser = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const createUser = async (data: CreateUserData) => {
    try {
      setIsSubmitting(true);
      console.log('Creating user with data:', data);
      
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
      
      // Call the edge function to create the user with service role permissions
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: tempPassword,
          name: `${data.firstName} ${data.lastName}`,
          role: data.role,
          company_id: null, // No company assignment by default
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('User created successfully:', result);
      
      toast.success(`User created successfully! ${data.sendInvitation ? 'Invitation sent.' : `Temporary password: ${tempPassword}`}`);
      navigate("/users");
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(`Failed to create user: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    createUser,
    isSubmitting
  };
};
