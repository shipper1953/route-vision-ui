
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyAddress } from "@/types/auth";

interface CompanyAddressCardProps {
  address: CompanyAddress;
  onAddressChange: (address: CompanyAddress) => void;
  onSave: () => void;
  saving: boolean;
}

export const CompanyAddressCard = ({ address, onAddressChange, onSave, saving }: CompanyAddressCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Address</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="street1">Street Address</Label>
          <Input
            id="street1"
            value={address.street1}
            onChange={(e) => onAddressChange({ ...address, street1: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="street2">Street Address 2 (Optional)</Label>
          <Input
            id="street2"
            value={address.street2}
            onChange={(e) => onAddressChange({ ...address, street2: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={address.city}
              onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={address.state}
              onChange={(e) => onAddressChange({ ...address, state: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              value={address.zip}
              onChange={(e) => onAddressChange({ ...address, zip: e.target.value })}
            />
          </div>
        </div>
        
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </CardContent>
    </Card>
  );
};
