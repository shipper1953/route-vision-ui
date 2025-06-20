
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreateUser, CreateUserData } from "@/hooks/useCreateUser";

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

export const CreateUserForm = () => {
  const navigate = useNavigate();
  const { createUser, isSubmitting } = useCreateUser();

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
    await createUser(data as CreateUserData);
  };

  return (
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
        
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/users")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
          
          <Button 
            type="submit"
            className="bg-tms-blue hover:bg-tms-blue-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
