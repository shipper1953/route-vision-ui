
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
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddressLookup type={type} />
        <AddressFormGrid prefix={type} />
      </CardContent>
    </Card>
  );
};
