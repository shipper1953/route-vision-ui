
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MarkupSettingsCardProps {
  markupType: 'percentage' | 'fixed';
  markupValue: number;
  onMarkupTypeChange: (type: 'percentage' | 'fixed') => void;
  onMarkupValueChange: (value: number) => void;
}

export const MarkupSettingsCard = ({ 
  markupType, 
  markupValue, 
  onMarkupTypeChange, 
  onMarkupValueChange 
}: MarkupSettingsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Markup Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="markup_type">Markup Type</Label>
            <Select 
              value={markupType} 
              onValueChange={onMarkupTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select markup type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="markup_value">
              Markup Value {markupType === 'percentage' ? '(%)' : '($)'}
            </Label>
            <Input
              id="markup_value"
              type="number"
              step="0.01"
              min="0"
              max={markupType === 'percentage' ? "100" : undefined}
              value={markupValue}
              onChange={(e) => onMarkupValueChange(parseFloat(e.target.value) || 0)}
              placeholder={markupType === 'percentage' ? "Enter percentage (0-100)" : "Enter fixed amount"}
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {markupType === 'percentage' 
            ? `A ${markupValue}% markup will be applied to all shipping rates.`
            : `A $${markupValue.toFixed(2)} markup will be added to all shipping rates.`
          }
        </div>
      </CardContent>
    </Card>
  );
};
