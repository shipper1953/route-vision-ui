
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardContent 
} from "@/components/ui/card";
import { AddressLookup } from "./AddressLookup";
import { AddressFormGrid } from "./AddressFormGrid";

interface AddressFormSectionProps {
  type: "from" | "to";
  title: string;
  description: string;
}

export const AddressFormSection = ({ type, title, description }: AddressFormSectionProps) => {  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {type === "from" 
            ? "Auto-populated from the warehouse selected on the order. Change the warehouse on the order page."
            : description
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {type === "to" && <AddressLookup type={type} />}
        <AddressFormGrid prefix={type} />
      </CardContent>
    </Card>
  );
};
