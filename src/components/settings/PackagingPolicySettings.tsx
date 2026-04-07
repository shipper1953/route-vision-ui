import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, History, Package, Target, Shield, Scale, GripVertical } from "lucide-react";
import { format } from "date-fns";

interface PolicyRow {
  id: string;
  company_id: string;
  optimization_objective: string;
  tie_breaker_order: string[];
  max_void_ratio: number;
  fragility_rules: Record<string, any>;
  custom_rules: any[];
  policy_version_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const OBJECTIVES = [
  {
    value: "smallest_fit",
    label: "Smallest Fit",
    description: "Minimize box volume — reduces dimensional weight and shipping cost",
    icon: Package,
  },
  {
    value: "lowest_landed_cost",
    label: "Lowest Landed Cost",
    description: "Optimize for total cost including box material + estimated shipping",
    icon: Scale,
  },
  {
    value: "damage_risk_min",
    label: "Minimize Damage Risk",
    description: "Tighter void ratio to reduce product movement during transit",
    icon: Shield,
  },
];

const TIE_BREAKER_OPTIONS = [
  { value: "smallest_volume", label: "Smallest Outer Volume" },
  { value: "lowest_dim_weight", label: "Lowest Dimensional Weight" },
  { value: "lowest_cost", label: "Lowest Box Cost" },
  { value: "highest_utilization", label: "Highest Utilization" },
];

export const PackagingPolicySettings = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyRow | null>(null);
  const [history, setHistory] = useState<PolicyRow[]>([]);

  // Editable state
  const [objective, setObjective] = useState("smallest_fit");
  const [tieBreakers, setTieBreakers] = useState<string[]>(["smallest_volume", "lowest_dim_weight", "lowest_cost"]);
  const [maxVoidRatio, setMaxVoidRatio] = useState(60);
  const [fragileVoidRatio, setFragileVoidRatio] = useState(40);

  useEffect(() => {
    if (userProfile?.company_id) {
      fetchPolicy();
      fetchHistory();
    }
  }, [userProfile?.company_id]);

  const fetchPolicy = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenant_packaging_policies")
      .select("*")
      .eq("company_id", userProfile!.company_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data && !error) {
      setPolicy(data as unknown as PolicyRow);
      setObjective(data.optimization_objective || "smallest_fit");
      setTieBreakers(
        (data.tie_breaker_order as unknown as string[]) || ["smallest_volume", "lowest_dim_weight", "lowest_cost"]
      );
      setMaxVoidRatio(Math.round(((data.max_void_ratio as number) || 0.6) * 100));
      const fragRules = data.fragility_rules as Record<string, any> | null;
      setFragileVoidRatio(Math.round(((fragRules?.max_void_ratio as number) || 0.4) * 100));
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from("tenant_packaging_policies")
      .select("*")
      .eq("company_id", userProfile!.company_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      setHistory(data as unknown as PolicyRow[]);
    }
  };

  const handleSave = async () => {
    if (!userProfile?.company_id) return;
    setSaving(true);

    try {
      // Deactivate current policy
      if (policy?.id) {
        await supabase
          .from("tenant_packaging_policies")
          .update({ is_active: false })
          .eq("id", policy.id);
      }

      // Create new policy version
      const { error } = await supabase.from("tenant_packaging_policies").insert({
        company_id: userProfile.company_id,
        optimization_objective: objective,
        tie_breaker_order: tieBreakers,
        max_void_ratio: maxVoidRatio / 100,
        fragility_rules: { max_void_ratio: fragileVoidRatio / 100 },
        is_active: true,
      });

      if (error) throw error;

      toast.success("Packaging policy saved successfully");
      fetchPolicy();
      fetchHistory();
    } catch (err) {
      toast.error("Failed to save policy");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const moveTieBreaker = (index: number, direction: "up" | "down") => {
    const newOrder = [...tieBreakers];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setTieBreakers(newOrder);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">Loading policy settings...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Objective */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Optimization Objective
          </CardTitle>
          <CardDescription>
            Choose what the box recommendation engine should prioritize
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {OBJECTIVES.map((obj) => {
              const Icon = obj.icon;
              return (
                <button
                  key={obj.value}
                  type="button"
                  onClick={() => setObjective(obj.value)}
                  className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                    objective === obj.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      objective === obj.value ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}
                  >
                    {objective === obj.value && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-semibold">{obj.label}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{obj.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tie Breakers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5" />
            Tie-Breaker Priority
          </CardTitle>
          <CardDescription>
            When multiple boxes score equally, these rules break the tie in order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tieBreakers.map((tb, index) => {
              const option = TIE_BREAKER_OPTIONS.find((o) => o.value === tb);
              return (
                <div
                  key={tb}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <span className="text-sm font-medium">{option?.label || tb}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTieBreaker(index, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveTieBreaker(index, "down")}
                      disabled={index === tieBreakers.length - 1}
                    >
                      ↓
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Void Ratio Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Void Ratio Thresholds</CardTitle>
          <CardDescription>
            Maximum allowed empty space inside a box. Lower values mean tighter fits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Standard Items</Label>
              <span className="text-sm font-medium">{maxVoidRatio}%</span>
            </div>
            <Slider
              value={[maxVoidRatio]}
              onValueChange={([v]) => setMaxVoidRatio(v)}
              min={10}
              max={80}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Boxes with more than {maxVoidRatio}% empty space will be penalized in scoring
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fragile Items</Label>
              <span className="text-sm font-medium">{fragileVoidRatio}%</span>
            </div>
            <Slider
              value={[fragileVoidRatio]}
              onValueChange={([v]) => setFragileVoidRatio(v)}
              min={5}
              max={50}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Tighter limit for fragile items to reduce product movement
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Policy"}
        </Button>
      </div>

      {/* Version History */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Policy Version History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Max Void</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="text-sm">
                      {format(new Date(h.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {OBJECTIVES.find((o) => o.value === h.optimization_objective)?.label ||
                          h.optimization_objective}
                      </Badge>
                    </TableCell>
                    <TableCell>{Math.round((h.max_void_ratio || 0.6) * 100)}%</TableCell>
                    <TableCell>
                      {h.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
