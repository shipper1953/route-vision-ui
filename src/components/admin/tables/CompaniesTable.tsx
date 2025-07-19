
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Company } from "@/types/auth";
import { Edit, Trash2, Users, Wallet, Percent } from "lucide-react";

interface CompaniesTableProps {
  companies: Company[];
  onEditClick: (company: Company) => void;
  onWalletClick: (company: Company) => void;
  onMarkupClick: (company: Company) => void;
  onToggleStatus: (companyId: string, isActive: boolean) => void;
}

export const CompaniesTable = ({ 
  companies, 
  onEditClick, 
  onWalletClick, 
  onMarkupClick,
  onToggleStatus 
}: CompaniesTableProps) => {
  if (companies.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No companies found. Create your first company to get started.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Markup Type</TableHead>
          <TableHead>Markup Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((company) => (
          <TableRow key={company.id}>
            <TableCell className="font-medium">{company.name}</TableCell>
            <TableCell>{company.email || 'N/A'}</TableCell>
            <TableCell>{company.phone || 'N/A'}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {company.markup_type === 'percentage' ? 'Percentage' : 'Fixed'}
              </Badge>
            </TableCell>
            <TableCell>
              {company.markup_type === 'percentage' 
                ? `${company.markup_value || 0}%` 
                : `$${(company.markup_value || 0).toFixed(2)}`
              }
            </TableCell>
            <TableCell>
              <Badge variant={company.is_active ? 'default' : 'secondary'}>
                {company.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              {new Date(company.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline">
                  <Users className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onWalletClick(company)}
                >
                  <Wallet className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onMarkupClick(company)}
                  title="Edit Markup"
                >
                  <Percent className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onEditClick(company)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={company.is_active ? "destructive" : "default"}
                  onClick={() => onToggleStatus(company.id, company.is_active)}
                >
                  {company.is_active ? <Trash2 className="h-4 w-4" /> : 'Activate'}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
