import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Company } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, DollarSign } from "lucide-react";

interface EditMarkupDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const EditMarkupDialog = ({
  company,
  open,
  onOpenChange,
  onSuccess,
}: EditMarkupDialogProps) => {
  const [markupType, setMarkupType] = useState<'percentage' | 'fixed'>(
    company?.markup_type || 'percentage'
  );
  const [markupValue, setMarkupValue] = useState<string>(
    company?.markup_value?.toString() || '0'
  );
  const [loading, setLoading] = useState(false);

  // Reset form when company changes
  useEffect(() => {
    if (company) {
      setMarkupType(company.markup_type || 'percentage');
      setMarkupValue(company.markup_value?.toString() || '0');
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setLoading(true);
    
    try {
      const numericValue = parseFloat(markupValue) || 0;
      
      // Validate percentage range
      if (markupType === 'percentage' && (numericValue < 0 || numericValue > 100)) {
        toast.error('Percentage markup must be between 0 and 100');
        return;
      }
      
      // Validate fixed amount
      if (markupType === 'fixed' && numericValue < 0) {
        toast.error('Fixed markup cannot be negative');
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update({
          markup_type: markupType,
          markup_value: numericValue,
        })
        .eq('id', company.id);

      if (error) {
        console.error('Error updating company markup:', error);
        toast.error('Failed to update markup settings');
        return;
      }

      toast.success('Markup settings updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating markup:', error);
      toast.error('Failed to update markup settings');
    } finally {
      setLoading(false);
    }
  };

  const getMarkupDescription = () => {
    if (markupType === 'percentage') {
      return `Add ${markupValue}% to all shipping rates for this company`;
    } else {
      return `Add $${markupValue} to all shipping rates for this company`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {markupType === 'percentage' ? (
              <Percent className="h-5 w-5" />
            ) : (
              <DollarSign className="h-5 w-5" />
            )}
            Edit Shipping Markup
          </DialogTitle>
          <DialogDescription>
            Configure shipping markup for {company?.name}. This will be applied to all shipping rates.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="markup-type">Markup Type</Label>
            <Select value={markupType} onValueChange={(value: 'percentage' | 'fixed') => setMarkupType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select markup type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Percentage
                  </div>
                </SelectItem>
                <SelectItem value="fixed">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fixed Amount
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="markup-value">
              Markup Value {markupType === 'percentage' ? '(%)' : '($)'}
            </Label>
            <div className="relative">
              <Input
                id="markup-value"
                type="number"
                min="0"
                max={markupType === 'percentage' ? "100" : undefined}
                step={markupType === 'percentage' ? "0.1" : "0.01"}
                value={markupValue}
                onChange={(e) => setMarkupValue(e.target.value)}
                placeholder={markupType === 'percentage' ? "0.0" : "0.00"}
                className={markupType === 'percentage' ? "pr-8" : "pl-8"}
              />
              {markupType === 'percentage' ? (
                <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              ) : (
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {getMarkupDescription()}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Markup'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};