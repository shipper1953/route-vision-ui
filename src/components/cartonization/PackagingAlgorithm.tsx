
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CartonizationParameters } from "@/services/cartonization/cartonizationEngine";
import { Settings, Package, Target, Zap } from "lucide-react";

interface PackagingAlgorithmProps {
  parameters: CartonizationParameters;
  onParametersChange: (updates: Partial<CartonizationParameters>) => void;
}

export const PackagingAlgorithm = ({ parameters, onParametersChange }: PackagingAlgorithmProps) => {
  const handleSliderChange = (key: keyof CartonizationParameters, value: number[]) => {
    onParametersChange({ [key]: value[0] });
  };

  const handleSwitchChange = (key: keyof CartonizationParameters, checked: boolean) => {
    onParametersChange({ [key]: checked });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-tms-blue" />
        <h2 className="text-xl font-semibold">Packaging Algorithm Configuration</h2>
      </div>

      {/* Optimization Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Optimization Strategy
          </CardTitle>
          <CardDescription>
            Choose your primary optimization goal for package selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="optimize-cost"
                checked={parameters.optimizeForCost}
                onCheckedChange={(checked) => handleSwitchChange('optimizeForCost', checked)}
              />
              <Label htmlFor="optimize-cost" className="flex items-center gap-2">
                Cost Optimization
                {parameters.optimizeForCost && <Badge variant="secondary">Active</Badge>}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="optimize-space"
                checked={parameters.optimizeForSpace}
                onCheckedChange={(checked) => handleSwitchChange('optimizeForSpace', checked)}
              />
              <Label htmlFor="optimize-space" className="flex items-center gap-2">
                Space Optimization
                {parameters.optimizeForSpace && <Badge variant="secondary">Active</Badge>}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fill Rate & Weight Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Package Constraints
          </CardTitle>
          <CardDescription>
            Set thresholds and limits for package selection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Fill Rate Threshold: {parameters.fillRateThreshold}%</Label>
            <Slider
              value={[parameters.fillRateThreshold]}
              onValueChange={(value) => handleSliderChange('fillRateThreshold', value)}
              max={100}
              min={50}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Minimum space utilization required before selecting a package
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Maximum Package Weight: {parameters.maxPackageWeight} lbs</Label>
            <Slider
              value={[parameters.maxPackageWeight]}
              onValueChange={(value) => handleSliderChange('maxPackageWeight', value)}
              max={150}
              min={10}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Maximum weight limit for any single package
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Packing Efficiency: {parameters.packingEfficiency}%</Label>
            <Slider
              value={[parameters.packingEfficiency]}
              onValueChange={(value) => handleSliderChange('packingEfficiency', value)}
              max={95}
              min={70}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Expected packing efficiency accounting for irregular shapes and padding
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Advanced Settings
          </CardTitle>
          <CardDescription>
            Fine-tune algorithm behavior and shipping calculations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Dimensional Weight Factor: {parameters.dimensionalWeightFactor}</Label>
            <Slider
              value={[parameters.dimensionalWeightFactor]}
              onValueChange={(value) => handleSliderChange('dimensionalWeightFactor', value)}
              max={200
              min={100}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Divisor used for dimensional weight calculations (standard: 139 for domestic)
            </p>
          </div>

          <Separator />

          <div className="flex items-center space-x-2">
            <Switch
              id="allow-partial"
              checked={parameters.allowPartialFill}
              onCheckedChange={(checked) => handleSwitchChange('allowPartialFill', checked)}
            />
            <Label htmlFor="allow-partial" className="flex items-center gap-2">
              Allow Partial Fill
              {parameters.allowPartialFill && <Badge variant="outline">Enabled</Badge>}
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Allow packages to be used even if they don't meet the fill rate threshold
          </p>
        </CardContent>
      </Card>

      {/* Current Configuration Summary */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Current Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Strategy</p>
              <p className="text-muted-foreground">
                {parameters.optimizeForCost && parameters.optimizeForSpace 
                  ? 'Balanced' 
                  : parameters.optimizeForCost 
                    ? 'Cost-focused' 
                    : parameters.optimizeForSpace 
                      ? 'Space-focused' 
                      : 'Default'}
              </p>
            </div>
            <div>
              <p className="font-medium">Fill Rate</p>
              <p className="text-muted-foreground">{parameters.fillRateThreshold}%</p>
            </div>
            <div>
              <p className="font-medium">Max Weight</p>
              <p className="text-muted-foreground">{parameters.maxPackageWeight} lbs</p>
            </div>
            <div>
              <p className="font-medium">Efficiency</p>
              <p className="text-muted-foreground">{parameters.packingEfficiency}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
