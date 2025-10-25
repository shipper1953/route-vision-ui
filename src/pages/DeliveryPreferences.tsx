import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TmsLayout } from "@/components/layout/TmsLayout";

export default function DeliveryPreferences() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    delivery_instructions: '',
    safe_place: '',
    gate_code: '',
    access_code: '',
    signature_required: false,
    email_notifications: true,
    sms_notifications: false,
    phone_number: '',
    vacation_hold_start: '',
    vacation_hold_end: '',
    preferred_delivery_window: 'any'
  });

  const handleSave = async () => {
    if (!userProfile?.email) {
      toast.error('User email not found');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('customer_delivery_preferences' as any)
        .upsert({
          customer_email: userProfile.email,
          company_id: userProfile.company_id,
          ...preferences
        });

      if (error) throw error;
      
      toast.success('Delivery preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TmsLayout>
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Delivery Preferences</h1>
          <p className="text-muted-foreground mt-2">
            Manage your delivery instructions and notification settings
          </p>
        </div>

        <div className="space-y-6">
          {/* Delivery Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Instructions</CardTitle>
              <CardDescription>
                Help carriers deliver your packages successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_instructions">Special Instructions</Label>
                <Textarea
                  id="delivery_instructions"
                  placeholder="e.g., Leave packages at the side door"
                  value={preferences.delivery_instructions}
                  onChange={(e) => setPreferences({ ...preferences, delivery_instructions: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="safe_place">Safe Place</Label>
                  <Input
                    id="safe_place"
                    placeholder="e.g., Front porch"
                    value={preferences.safe_place}
                    onChange={(e) => setPreferences({ ...preferences, safe_place: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gate_code">Gate Code</Label>
                  <Input
                    id="gate_code"
                    type="password"
                    placeholder="Building/gate access code"
                    value={preferences.gate_code}
                    onChange={(e) => setPreferences({ ...preferences, gate_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Signature Required</Label>
                  <p className="text-sm text-muted-foreground">
                    Require signature for all deliveries
                  </p>
                </div>
                <Switch
                  checked={preferences.signature_required}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, signature_required: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive delivery updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive shipment updates via email
                  </p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, email_notifications: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive shipment updates via text message
                  </p>
                </div>
                <Switch
                  checked={preferences.sms_notifications}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, sms_notifications: checked })}
                />
              </div>

              {preferences.sms_notifications && (
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={preferences.phone_number}
                    onChange={(e) => setPreferences({ ...preferences, phone_number: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vacation Hold */}
          <Card>
            <CardHeader>
              <CardTitle>Vacation Hold</CardTitle>
              <CardDescription>
                Temporarily hold deliveries when you're away
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vacation_start">Hold Start Date</Label>
                  <Input
                    id="vacation_start"
                    type="date"
                    value={preferences.vacation_hold_start}
                    onChange={(e) => setPreferences({ ...preferences, vacation_hold_start: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vacation_end">Hold End Date</Label>
                  <Input
                    id="vacation_end"
                    type="date"
                    value={preferences.vacation_hold_end}
                    onChange={(e) => setPreferences({ ...preferences, vacation_hold_end: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>
      </div>
    </TmsLayout>
  );
}
