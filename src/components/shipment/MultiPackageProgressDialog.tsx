import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, Loader2, Clock, Package, DollarSign, Truck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PackageStepStatus = "pending" | "running" | "success" | "failed";

export interface PackageProgressItem {
  index: number;
  boxName?: string;
  dimensions?: { length: number; width: number; height: number };
  weight?: number;
  // Rate shopping
  rateStatus: PackageStepStatus;
  matchedRate?: {
    carrier: string;
    service: string;
    provider?: string;
    amount: number;
    matchType: "exact" | "fallback-provider" | "fallback-cheapest";
  };
  rateError?: string;
  // Label purchase
  labelStatus: PackageStepStatus;
  trackingNumber?: string;
  labelError?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  packages: PackageProgressItem[];
  isComplete: boolean;
  selectedCarrier?: string;
  selectedService?: string;
}

const StatusIcon = ({ status }: { status: PackageStepStatus }) => {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "success") return <Check className="h-4 w-4 text-green-600" />;
  if (status === "failed") return <X className="h-4 w-4 text-destructive" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
};

const StatusBadge = ({ status, label }: { status: PackageStepStatus; label: string }) => {
  const variants: Record<PackageStepStatus, string> = {
    pending: "bg-muted text-muted-foreground border-muted",
    running: "bg-primary/10 text-primary border-primary/30",
    success: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/30 dark:text-green-400",
    failed: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("text-xs gap-1", variants[status])}>
      <StatusIcon status={status} />
      {label}
    </Badge>
  );
};

export const MultiPackageProgressDialog = ({
  isOpen,
  onClose,
  packages,
  isComplete,
  selectedCarrier,
  selectedService,
}: Props) => {
  const total = packages.length;
  const succeeded = packages.filter((p) => p.labelStatus === "success").length;
  const failed = packages.filter((p) => p.labelStatus === "failed").length;
  const completed = succeeded + failed;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Multi-Package Label Purchase
          </DialogTitle>
          <DialogDescription>
            {selectedCarrier && selectedService ? (
              <>
                Rate shopping &amp; purchasing labels using{" "}
                <span className="font-medium text-foreground">
                  {selectedCarrier} {selectedService}
                </span>{" "}
                for each package.
              </>
            ) : (
              "Rate shopping and purchasing labels for each package."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Overall progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {completed} of {total} packages processed
            </span>
            <div className="flex items-center gap-3 text-xs">
              {succeeded > 0 && (
                <span className="flex items-center gap-1 text-green-700 dark:text-green-400">
                  <Check className="h-3 w-3" /> {succeeded} succeeded
                </span>
              )}
              {failed > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <X className="h-3 w-3" /> {failed} failed
                </span>
              )}
            </div>
          </div>
          <Progress value={percent} className="h-2" />
        </div>

        {/* Per-package list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 py-2">
            {packages.map((pkg) => {
              const isActive = pkg.rateStatus === "running" || pkg.labelStatus === "running";
              const isFailed = pkg.rateStatus === "failed" || pkg.labelStatus === "failed";
              const isDone = pkg.labelStatus === "success";
              return (
                <div
                  key={pkg.index}
                  className={cn(
                    "border rounded-lg p-4 space-y-3 transition-colors",
                    isActive && "border-primary/50 bg-primary/5",
                    isDone && "border-green-300 bg-green-50/40 dark:bg-green-950/10",
                    isFailed && "border-destructive/40 bg-destructive/5"
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        Package {pkg.index + 1}
                        {pkg.boxName && (
                          <span className="text-sm font-normal text-muted-foreground">
                            • {pkg.boxName}
                          </span>
                        )}
                      </div>
                      {(pkg.dimensions || pkg.weight) && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {pkg.dimensions && (
                            <span>
                              {pkg.dimensions.length}×{pkg.dimensions.width}×{pkg.dimensions.height} in
                            </span>
                          )}
                          {pkg.dimensions && pkg.weight ? " • " : ""}
                          {pkg.weight ? <span>{pkg.weight} lb</span> : null}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 1: Rate shopping */}
                  <div className="flex items-start gap-3 pl-1">
                    <div className="mt-0.5">
                      <StatusIcon status={pkg.rateStatus} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Rate shopping</span>
                        <StatusBadge
                          status={pkg.rateStatus}
                          label={
                            pkg.rateStatus === "pending"
                              ? "Waiting"
                              : pkg.rateStatus === "running"
                                ? "Fetching rates..."
                                : pkg.rateStatus === "success"
                                  ? "Rate found"
                                  : "Failed"
                          }
                        />
                      </div>

                      {pkg.matchedRate && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="flex items-center gap-1 font-medium">
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                            {pkg.matchedRate.carrier} • {pkg.matchedRate.service}
                          </span>
                          {pkg.matchedRate.provider && (
                            <Badge variant="secondary" className="text-xs">
                              {pkg.matchedRate.provider}
                            </Badge>
                          )}
                          <span className="flex items-center gap-0.5 font-semibold">
                            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                            {pkg.matchedRate.amount.toFixed(2)}
                          </span>
                          {pkg.matchedRate.matchType !== "exact" && (
                            <Badge
                              variant="outline"
                              className="text-xs border-yellow-400 text-yellow-700 dark:text-yellow-500"
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {pkg.matchedRate.matchType === "fallback-provider"
                                ? "Fallback: same provider"
                                : "Fallback: cheapest available"}
                            </Badge>
                          )}
                        </div>
                      )}
                      {pkg.rateError && (
                        <div className="mt-1 text-xs text-destructive">{pkg.rateError}</div>
                      )}
                    </div>
                  </div>

                  {/* Step 2: Label purchase */}
                  <div className="flex items-start gap-3 pl-1">
                    <div className="mt-0.5">
                      <StatusIcon status={pkg.labelStatus} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Label purchase</span>
                        <StatusBadge
                          status={pkg.labelStatus}
                          label={
                            pkg.labelStatus === "pending"
                              ? "Waiting"
                              : pkg.labelStatus === "running"
                                ? "Purchasing..."
                                : pkg.labelStatus === "success"
                                  ? "Purchased"
                                  : "Failed"
                          }
                        />
                      </div>
                      {pkg.trackingNumber && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Tracking:{" "}
                          <span className="font-mono text-foreground">{pkg.trackingNumber}</span>
                        </div>
                      )}
                      {pkg.labelError && (
                        <div className="mt-1 text-xs text-destructive">{pkg.labelError}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose} disabled={!isComplete} variant={isComplete ? "default" : "outline"}>
            {isComplete ? "Close" : "Processing..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
