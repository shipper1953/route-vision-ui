
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { LockIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
import { Separator } from "@/components/ui/separator";

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    newPassword: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export const SecurityPlaceholder = () => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: PasswordFormValues) {
    try {
      setIsLoading(true);
      
      // In production, this is where you would call the Supabase function to update the password
      // For example:
      // const { error } = await supabase.auth.updateUser({
      //   password: data.newPassword
      // })
      
      // For now, we'll just simulate a successful password change
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Password updated", {
        description: "Your password has been changed successfully.",
      });
      
      form.reset();
    } catch (error) {
      toast.error("Failed to update password", {
        description: "There was a problem updating your password. Please try again.",
      });
      console.error("Password update error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Security Settings</h3>
        <p className="text-sm text-muted-foreground">
          Update your password and manage security preferences
        </p>
      </div>
      <Separator />
      
      <div className="space-y-8">
        <div>
          <h4 className="text-sm font-medium mb-4 flex items-center">
            <LockIcon className="h-4 w-4 mr-2" />
            Change Password
          </h4>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Password must be at least 8 characters long.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="bg-tms-blue"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Two-Factor Authentication</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Add an additional layer of security to your account.
          </p>
          <Button variant="outline">Enable 2FA</Button>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Sessions</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your active sessions and sign out from other devices.
          </p>
          <Button variant="outline">Manage Sessions</Button>
        </div>
      </div>
    </div>
  );
};
