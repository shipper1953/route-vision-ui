import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Building2, Key, Mail } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ProfileSettings = () => {
  const { user, userProfile, logout } = useAuth();
  const { company } = useCompanyInfo(userProfile?.company_id);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile?.name || "",
      email: userProfile?.email || "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: ProfileForm) => {
    if (!userProfile) return;
    
    setIsUpdatingProfile(true);
    try {
      // Update user profile in database
      const { error: profileError } = await supabase
        .from('users')
        .update({
          name: data.name,
          email: data.email,
        })
        .eq('id', userProfile.id);

      if (profileError) throw profileError;

      // Update email in auth if changed
      if (data.email !== userProfile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email
        });

        if (emailError) throw emailError;
        toast.success('Profile updated successfully! Please check your email to confirm the new email address.');
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setIsUpdatingPassword(true);
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userProfile?.email || '',
        password: data.currentPassword,
      });

      if (verifyError) {
        toast.error('Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      passwordForm.reset();
    } catch (error: any) {
      console.error('Password update error:', error);
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userProfile?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    }
  };

  if (!userProfile) {
    return (
      <TmsLayout>
        <div>Loading...</div>
      </TmsLayout>
    );
  }

  return (
    <TmsLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="company">Company Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="Enter your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        Role: <span className="font-medium capitalize">{userProfile.role.replace('_', ' ')}</span>
                      </div>
                      <Button type="submit" disabled={isUpdatingProfile}>
                        {isUpdatingProfile ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Company Information</CardTitle>
                </div>
                <CardDescription>
                  View your company details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    {company?.name || 'Loading...'}
                  </div>
                </div>
                
                {company?.email && (
                  <div>
                    <label className="text-sm font-medium">Company Email</label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      {company.email}
                    </div>
                  </div>
                )}
                
                {company?.phone && (
                  <div>
                    <label className="text-sm font-medium">Company Phone</label>
                    <div className="mt-1 p-3 bg-muted rounded-md">
                      {company.phone}
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Contact your company administrator to update company information.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <CardTitle>Change Password</CardTitle>
                  </div>
                  <CardDescription>
                    Update your password to keep your account secure
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter current password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={passwordForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button type="submit" disabled={isUpdatingPassword}>
                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Password Reset</CardTitle>
                  </div>
                  <CardDescription>
                    Send a password reset email to your registered email address
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" onClick={handlePasswordReset}>
                    Send Password Reset Email
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TmsLayout>
  );
};

export default ProfileSettings;