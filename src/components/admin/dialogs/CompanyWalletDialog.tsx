
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WalletManagement } from "../WalletManagement";
import { Company } from "@/types/auth";

interface CompanyWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}

export const CompanyWalletDialog = ({ 
  open, 
  onOpenChange, 
  company 
}: CompanyWalletDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Wallet Management - {company?.name || 'Company'}
          </DialogTitle>
          <DialogDescription>
            Manage wallet balance, transactions, and payment methods for this company.
          </DialogDescription>
        </DialogHeader>
        {company && (
          <WalletManagement companyId={company.id} />
        )}
      </DialogContent>
    </Dialog>
  );
};
