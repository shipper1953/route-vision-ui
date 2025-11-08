import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface WebhookStatusBadgeProps {
  status: 'active' | 'inactive' | 'partial';
  count?: number;
}

export const WebhookStatusBadge = ({ status, count }: WebhookStatusBadgeProps) => {
  if (status === 'active') {
    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle className="h-3 w-3 mr-1" />
        Webhooks Active {count && `(${count})`}
      </Badge>
    );
  }
  
  if (status === 'partial') {
    return (
      <Badge variant="secondary" className="bg-yellow-500">
        <AlertCircle className="h-3 w-3 mr-1" />
        Partial Webhooks {count && `(${count})`}
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" />
      No Webhooks
    </Badge>
  );
};
