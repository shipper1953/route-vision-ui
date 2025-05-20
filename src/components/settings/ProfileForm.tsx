
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Save, MapPin } from "lucide-react";
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

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const ProfileForm = () => {
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
