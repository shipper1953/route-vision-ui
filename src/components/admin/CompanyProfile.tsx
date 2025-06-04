
import { useAuth } from "@/context";
import { CompanyInformationCard } from "./profile/CompanyInformationCard";
import { CompanyAddressCard } from "./profile/CompanyAddressCard";
import { MarkupSettingsCard } from "./profile/MarkupSettingsCard";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

interface CompanyProfileProps {
  companyId?: string;
}

export const CompanyProfile = ({ companyId }: CompanyProfileProps) => {
  const { isSuperAdmin } = useAuth();
  const { company, loading, saving, formData, setFormData, saveCompany } = useCompanyProfile(companyId);

  if (loading) {
    return <div>Loading company profile...</div>;
  }

  if (!companyId) {
    return <div>No company assigned to your account.</div>;
  }

  const handleFormDataChange = (newData: any) => {
    setFormData(newData);
  };

  const handleAddressChange = (address: any) => {
    setFormData({ ...formData, address });
  };

  const handleMarkupTypeChange = (markupType: 'percentage' | 'fixed') => {
    setFormData({ ...formData, markup_type: markupType });
  };

  const handleMarkupValueChange = (markupValue: number) => {
    setFormData({ ...formData, markup_value: markupValue });
  };

  const handleSave = () => {
    saveCompany(isSuperAdmin);
  };

  return (
    <div className="space-y-6">
      <CompanyInformationCard 
        formData={formData}
        onFormDataChange={handleFormDataChange}
      />

      {isSuperAdmin && (
        <MarkupSettingsCard
          markupType={formData.markup_type}
          markupValue={formData.markup_value}
          onMarkupTypeChange={handleMarkupTypeChange}
          onMarkupValueChange={handleMarkupValueChange}
        />
      )}

      <CompanyAddressCard
        address={formData.address}
        onAddressChange={handleAddressChange}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
};
