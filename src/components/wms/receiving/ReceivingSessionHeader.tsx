import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Pause, CheckCircle } from "lucide-react";

interface ReceivingSessionHeaderProps {
  session: any;
  poData: any;
  onPause: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: ComponentProps<typeof Badge>["variant"] }> = {
  in_progress: { label: 'In Progress', variant: 'default' },
  paused: { label: 'Paused', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'destructive' }
};

export const ReceivingSessionHeader = ({
  session,
  poData,
  onPause,
  onComplete,
  onCancel
}: ReceivingSessionHeaderProps) => {
  const statusConfig = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.in_progress;

  return (
    <div className="bg-card border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">{poData?.po_number}</h2>
          <p className="text-sm text-muted-foreground">
            Session: {session.session_number}
          </p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
      
      <div className="text-sm space-y-1">
        <p><span className="text-muted-foreground">Customer:</span> {poData?.customers?.name}</p>
        <p><span className="text-muted-foreground">Vendor:</span> {poData?.vendor_name || '-'}</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onPause}
          className="flex-1"
        >
          <Pause className="mr-2 h-4 w-4" />
          Pause
        </Button>
        <Button 
          variant="default" 
          size="sm" 
          onClick={onComplete}
          className="flex-1"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Complete
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
