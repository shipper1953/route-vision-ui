
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { useAuth } from "@/context";
import { Navigate } from "react-router-dom";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const userSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(['company_admin', 'user', 'super_admin'], {
    required_error: "Please select a role",
  }),
  sendInvitation: z.boolean().default(true),
});

type UserForm = z.infer<typeof userSchema>;

const CreateUser = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Show loading state while checking auth
  if (authLoading) {
    return (
      <TmsLayout>
        <div className="flex items-center justify-center min-h-64">
          <div>Loading...</div>
        </div>
      </TmsLayout>
    );
  }

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const form = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
      sendInvitation: true,
    },
  });
  
  const onSubmit = async (data: UserForm) => {
    try {
      setIsSubmitting(true);
      console.log('Creating user with data:', data);
      
      // Create user account using Supabase Auth Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: Math.random().toString(36).slice(-8), // Temporary password
        email_confirm: !data.sendInvitation, // Auto-confirm if not sending invitation
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          name: `${data.firstName} ${data.lastName}`,
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        toast.error("Failed to create user: " + authError.message);
        return;
      }

      console.log('User created in auth:', authData.user?.id);

      // Wait a moment for the trigger to create the user in the users table
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now update the user's role using the service role
      if (authData.user) {
        console.log('Updating user role to:', data.role);
        
        // First check if the user exists in the users table
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, role')
          .eq('id', authData.user.id)
          .single();

        console.log('Existing user check:', existingUser, checkError);

        if (checkError && checkError.code !== 'PGRST116') {
          console.error("Error checking existing user:", checkError);
        }

        // Update or insert the user with the correct role
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .upsert({
            id: authData.user.id,
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            role: data.role,
            password: '', // Password is managed by Supabase auth
          }, {
            onConflict: 'id'
          });

        console.log('Role update result:', updateData, updateError);

        if (updateError) {
          console.error("Failed to update user role:", updateError);
          toast.error("User created but failed to set role: " + updateError.message);
        } else {
          console.log('User role updated successfully');
        }
      }
      
      toast.success("User created successfully!");
      navigate("/users");
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Create User</h1>
          <p className="text-muted-foreground">Add a new user to Ship Tornado</p>
        </div>
      </div>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-tms-blue" />
            <CardTitle>User Information</CardTitle>
          </div>
          <CardDescription>
            Enter the details for the new user. They will receive an email invitation to join the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form id="create-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Email address" type="email" {...field} />
                    </FormControl>
                    <FormDescription>
                      This email will be used for login and notifications
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="company_admin">Company Admin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The user's role determines their permissions in the system
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="sendInvitation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Send invitation email
                      </FormLabel>
                      <FormDescription>
                        An email will be sent to this user with instructions to set up their account
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          
          <Button 
            form="create-user-form"
            type="submit"
            className="bg-tms-blue hover:bg-tms-blue-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </CardFooter>
      </Card>
    </TmsLayout>
  );
};

export default CreateUser;
