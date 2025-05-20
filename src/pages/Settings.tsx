
import { TmsLayout } from "@/components/layout/TmsLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Mail, Bell, User, Lock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const profileFormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: "Username must be at least 2 characters.",
    })
    .max(30, {
      message: "Username must not be longer than 30 characters.",
    }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  // Default shipping address fields
  fromName: z.string().min(1, "Name is required"),
  fromCompany: z.string().optional(),
  fromStreet1: z.string().min(1, "Street address is required"),
  fromStreet2: z.string().optional(),
  fromCity: z.string().min(1, "City is required"),
  fromState: z.string().min(1, "State is required"),
  fromZip: z.string().min(1, "Zip code is required"),
  fromCountry: z.string().min(1, "Country is required"),
  fromPhone: z.string().optional(),
  fromEmail: z.string().email("Invalid email address").optional(),
});

const notificationsFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  weeklyReports: z.boolean().default(true),
  marketingEmails: z.boolean().default(false),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

const ProfileForm = () => {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: "johndoe",
      email: "john.doe@example.com",
      fromName: localStorage.getItem("fromName") || "John Doe",
      fromCompany: localStorage.getItem("fromCompany") || "Ship Tornado",
      fromStreet1: localStorage.getItem("fromStreet1") || "123 Main St",
      fromStreet2: localStorage.getItem("fromStreet2") || "",
      fromCity: localStorage.getItem("fromCity") || "Boston",
      fromState: localStorage.getItem("fromState") || "MA",
      fromZip: localStorage.getItem("fromZip") || "02108", 
      fromCountry: localStorage.getItem("fromCountry") || "US",
      fromPhone: localStorage.getItem("fromPhone") || "555-123-4567",
      fromEmail: localStorage.getItem("fromEmail") || "john@shiptornado.com",
    },
  });

  function onSubmit(data: ProfileFormValues) {
    // Save the shipping details to localStorage to persist between sessions
    localStorage.setItem("fromName", data.fromName);
    localStorage.setItem("fromCompany", data.fromCompany || "");
    localStorage.setItem("fromStreet1", data.fromStreet1);
    localStorage.setItem("fromStreet2", data.fromStreet2 || "");
    localStorage.setItem("fromCity", data.fromCity);
    localStorage.setItem("fromState", data.fromState);
    localStorage.setItem("fromZip", data.fromZip);
    localStorage.setItem("fromCountry", data.fromCountry);
    localStorage.setItem("fromPhone", data.fromPhone || "");
    localStorage.setItem("fromEmail", data.fromEmail || "");
    
    toast.success("Profile updated", {
      description: "Your profile settings have been updated.",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  This is your public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormDescription>
                  We'll use this email to contact you.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center">
            <MapPin className="mr-2 h-4 w-4" />
            Default Shipping Address
          </h3>
          <p className="text-sm text-muted-foreground">
            This address will be used as the default "From" address when creating shipments
          </p>
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fromCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="fromStreet1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fromStreet2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Street Address 2 (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Apt, suite, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="fromCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fromState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input placeholder="State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fromZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Zip code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="fromCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Country" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fromPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="fromEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <Button type="submit" className="bg-tms-blue">
          <Save className="mr-2 h-4 w-4" />
          Save changes
        </Button>
      </form>
    </Form>
  );
};

const NotificationsForm = () => {
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      weeklyReports: true,
      marketingEmails: false,
    },
  });

  function onSubmit(data: NotificationsFormValues) {
    toast.success("Notification preferences updated", {
      description: "Your notification settings have been saved.",
    });
    console.log(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="emailNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Email notifications</FormLabel>
                  <FormDescription>
                    Receive notifications via email.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pushNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Push notifications</FormLabel>
                  <FormDescription>
                    Receive push notifications in the app.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weeklyReports"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Weekly reports</FormLabel>
                  <FormDescription>
                    Receive weekly summary reports.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="marketingEmails"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Marketing emails</FormLabel>
                  <FormDescription>
                    Receive emails about new products and features.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="bg-tms-blue">
          <Save className="mr-2 h-4 w-4" />
          Save preferences
        </Button>
      </form>
    </Form>
  );
};

export default function Settings() {
  return (
    <TmsLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-tms-blue">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Manage your profile and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6 grid grid-cols-3 max-w-md">
              <TabsTrigger value="profile">
                <User className="mr-2 h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="mr-2 h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Personal Information</h3>
                <p className="text-sm text-muted-foreground">
                  Update your personal information and contact details
                </p>
              </div>
              <Separator />
              <ProfileForm />
            </TabsContent>
            <TabsContent value="notifications" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">
                  Configure how you receive notifications
                </p>
              </div>
              <Separator />
              <NotificationsForm />
            </TabsContent>
            <TabsContent value="security" className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Security Settings</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your security preferences
                </p>
              </div>
              <Separator />
              <div className="p-6 bg-muted rounded-md">
                <p className="text-muted-foreground text-center">
                  Security settings coming soon
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TmsLayout>
  );
}
