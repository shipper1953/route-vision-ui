
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Company } from "@/types/auth";
import { CompanyWalletDialog } from "./dialogs/CompanyWalletDialog";
import { EditMarkupDialog } from "./dialogs/EditMarkupDialog";
import { useCompanyManagement } from "./hooks/useCompanyManagement";
import { CreateCompanyDialog } from "./dialogs/CreateCompanyDialog";
import { EditCompanyDialog } from "./dialogs/EditCompanyDialog";
import { CompaniesTable } from "./tables/CompaniesTable";

export const CompanyManagement = () => {
  const { companies, loading, setCompanies, toggleCompanyStatus } = useCompanyManagement();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [isMarkupDialogOpen, setIsMarkupDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [markupCompany, setMarkupCompany] = useState<Company | null>(null);

  const handleCompanyCreated = (newCompany: Company) => {
    setCompanies([newCompany, ...companies]);
  };

  const handleCompanyUpdated = (updatedCompany: Company) => {
    setCompanies(companies.map(company => 
      company.id === updatedCompany.id ? updatedCompany : company
    ));
  };

  const handleEditClick = (company: Company) => {
    setEditingCompany({ ...company });
    setIsEditDialogOpen(true);
  };

  const handleWalletClick = (company: Company) => {
    setSelectedCompany(company);
    setIsWalletDialogOpen(true);
  };

  const handleMarkupClick = (company: Company) => {
    setMarkupCompany(company);
    setIsMarkupDialogOpen(true);
  };

  const handleMarkupUpdated = () => {
    // Refresh companies list to show updated markup values
    window.location.reload();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tms-navy mr-4"></div>
            <p>Loading companies...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Company Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {companies.length} companies found
            </p>
          </div>
          <CreateCompanyDialog onCompanyCreated={handleCompanyCreated} />
        </div>
      </CardHeader>
      <CardContent>
        <CompaniesTable
          companies={companies}
          onEditClick={handleEditClick}
          onWalletClick={handleWalletClick}
          onMarkupClick={handleMarkupClick}
          onToggleStatus={toggleCompanyStatus}
        />

        <EditCompanyDialog
          company={editingCompany}
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onCompanyUpdated={handleCompanyUpdated}
        />

        <CompanyWalletDialog
          open={isWalletDialogOpen}
          onOpenChange={setIsWalletDialogOpen}
          company={selectedCompany}
        />

        <EditMarkupDialog
          company={markupCompany}
          open={isMarkupDialogOpen}
          onOpenChange={setIsMarkupDialogOpen}
          onSuccess={handleMarkupUpdated}
        />
      </CardContent>
    </Card>
  );
};
