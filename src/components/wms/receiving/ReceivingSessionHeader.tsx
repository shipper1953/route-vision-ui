import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { X, Pause, CheckCircle } from "lucide-react";

interface SessionBadge {
  label: string;
  variant?: BadgeProps["variant"];
}

interface SessionMetadata {
  label: string;
  value?: string | null;
}

interface ReceivingSessionHeaderProps {
  session: any;
  title: string;
  subtitle?: string;
  badge?: SessionBadge;
  metadata?: SessionMetadata[];
  onPause: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const ReceivingSessionHeader = ({
  session,
  title,
  subtitle,
  badge = { label: "In Progress", variant: "default" },
  metadata = [],
  onPause,
  onComplete,
  onCancel
}: ReceivingSessionHeaderProps) => {
  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Session: {session.session_number}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <Badge variant={badge.variant ?? "default"} className="capitalize">
          {badge.label}
        </Badge>
      </div>

      {metadata.length > 0 && (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {metadata.map((item) => (
            <p key={item.label} className="flex flex-col">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value || "-"}</span>
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="sm:w-auto"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
