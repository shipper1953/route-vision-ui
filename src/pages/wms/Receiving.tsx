import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useWmsReceiving } from "@/hooks/useWmsReceiving";
import { useTransferOrders } from "@/hooks/useTransferOrders";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { POSelectionCard } from "@/components/wms/receiving/POSelectionCard";
import { TransferSelectionCard } from "@/components/wms/receiving/TransferSelectionCard";
import { ReceivingSessionHeader } from "@/components/wms/receiving/ReceivingSessionHeader";
import { BarcodeScanInput } from "@/components/wms/receiving/BarcodeScanInput";
import { ReceivingItemForm } from "@/components/wms/receiving/ReceivingItemForm";
import { ReceivedItemsList } from "@/components/wms/receiving/ReceivedItemsList";
import { Button } from "@/components/ui/button";
import type { BadgeProps } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

const PO_BADGE_VARIANTS: Record<string, BadgeProps["variant"]> = {
  pending: "default",
  partially_received: "secondary",
  received: "outline",
  closed: "outline",
  cancelled: "destructive"
};

const TRANSFER_BADGE_VARIANTS: Record<string, BadgeProps["variant"]> = {
  scheduled: "secondary",
  in_transit: "default",
  partially_received: "secondary",
  received: "outline",
  cancelled: "destructive"
};

const Receiving = () => {
  const {
    loading: poLoading,
    purchaseOrders,
    activeSession,
    receivedItems,
    createReceivingSession,
    receiveItem,
    fetchReceivedItems,
    completeReceivingSession,
    pauseReceivingSession
  } = useWmsReceiving();

  const { transferOrders, loading: transferLoading } = useTransferOrders();

  const [receivingType, setReceivingType] = useState<"purchase_order" | "transfer_order">("purchase_order");
  const [scannedItem, setScannedItem] = useState<any>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<any>(null);
  const [currentPO, setCurrentPO] = useState<any>(null);
  const [currentTransfer, setCurrentTransfer] = useState<any>(null);
  const [activeTransferSession, setActiveTransferSession] = useState<any>(null);
  const [transferReceivedItems, setTransferReceivedItems] = useState<any[]>([]);

  useEffect(() => {
    if (receivingType === "purchase_order" && activeSession) {
      fetchReceivedItems(activeSession.id);
      const po = purchaseOrders.find(p => p.id === activeSession.po_id);
      setCurrentPO(po);
    }
  }, [receivingType, activeSession, purchaseOrders, fetchReceivedItems]);

  useEffect(() => {
    if (receivingType === "transfer_order" && activeTransferSession) {
      const transfer = transferOrders.find(t => t.id === activeTransferSession.transfer_id);
      setCurrentTransfer(transfer);
    }
  }, [receivingType, activeTransferSession, transferOrders]);

  const resetFormState = () => {
    setScannedItem(null);
    setSelectedLineItem(null);
  };

  const handleStartPurchaseReceiving = async (poId: string, warehouseId: string) => {
    const session = await createReceivingSession(poId, warehouseId);
    if (session) {
      const po = purchaseOrders.find(p => p.id === poId);
      setCurrentPO(po);
      setReceivingType("purchase_order");
      resetFormState();
    }
  };

  const handleStartTransferReceiving = (transferId: string, warehouseId: string) => {
    const transfer = transferOrders.find(t => t.id === transferId);
    if (!transfer) return;

    const sessionNumber = `TRF-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
    const session = {
      id: `${transferId}-${Date.now()}`,
      transfer_id: transferId,
      session_number: sessionNumber,
      warehouse_id: warehouseId,
      status: "in_progress"
    };

    setActiveTransferSession(session);
    setCurrentTransfer(transfer);
    setTransferReceivedItems([]);
    setReceivingType("transfer_order");
    resetFormState();
    toast.success("Transfer receiving session started");
  };

  const handleBarcodeScan = (barcode: string) => {
    if (receivingType === "purchase_order") {
      if (!currentPO) return;

      const poLineItem = currentPO.po_line_items?.find((line: any) => {
        const item = line.items;
        const uomConfig = item?.uom_config || {};

        return Object.values(uomConfig).some((uom: any) =>
          uom?.barcode?.toLowerCase() === barcode.toLowerCase()
        ) || item?.sku?.toLowerCase() === barcode.toLowerCase();
      });

      if (poLineItem) {
        setScannedItem(poLineItem.items);
        setSelectedLineItem(poLineItem);
      } else {
        toast.error("Item not found in purchase order");
      }
    } else {
      if (!currentTransfer) return;

      const transferLineItem = currentTransfer.transfer_line_items?.find((line: any) => {
        const item = line.items;
        const uomConfig = item?.uom_config || {};

        return Object.values(uomConfig).some((uom: any) =>
          uom?.barcode?.toLowerCase() === barcode.toLowerCase()
        ) || item?.sku?.toLowerCase() === barcode.toLowerCase();
      });

      if (transferLineItem) {
        setScannedItem(transferLineItem.items);
        setSelectedLineItem(transferLineItem);
      } else {
        toast.error("Item not found in transfer order");
      }
    }
  };

  const handleReceiveItem = async (data: {
    uom: string;
    quantity: number;
    lotNumber?: string;
    serialNumbers?: string[];
    condition: string;
  }) => {
    if (!scannedItem || !selectedLineItem) return;

    if (receivingType === "purchase_order") {
      if (!activeSession) return;

      await receiveItem({
        sessionId: activeSession.id,
        poLineId: selectedLineItem.id,
        itemId: scannedItem.id,
        uom: data.uom,
        quantityReceived: data.quantity,
        lotNumber: data.lotNumber,
        serialNumbers: data.serialNumbers,
        condition: data.condition,
        qcRequired: false
      });
    } else {
      if (!activeTransferSession || !currentTransfer) return;

      const receivedAt = new Date().toISOString();
      setTransferReceivedItems(prev => [
        ...prev,
        {
          id: `${selectedLineItem.id}-${receivedAt}`,
          items: scannedItem,
          quantity_received: data.quantity,
          uom: data.uom,
          lot_number: data.lotNumber,
          serial_numbers: data.serialNumbers,
          condition: data.condition,
          received_at: receivedAt
        }
      ]);

      setCurrentTransfer({
        ...currentTransfer,
        transfer_line_items: currentTransfer.transfer_line_items?.map((line: any) =>
          line.id === selectedLineItem.id
            ? {
                ...line,
                quantity_received: (line.quantity_received || 0) + data.quantity
              }
            : line
        )
      });

      toast.success("Item received for transfer order");
    }

    resetFormState();
  };

  const handleComplete = async () => {
    if (receivingType === "purchase_order") {
      if (activeSession && confirm("Complete this receiving session?")) {
        await completeReceivingSession(activeSession.id);
        setCurrentPO(null);
        resetFormState();
      }
    } else {
      if (activeTransferSession && confirm("Complete this receiving session?")) {
        toast.success("Transfer receiving session completed");
        setActiveTransferSession(null);
        setCurrentTransfer(null);
        setTransferReceivedItems([]);
        resetFormState();
      }
    }
  };

  const handlePause = async () => {
    if (receivingType === "purchase_order") {
      if (activeSession) {
        await pauseReceivingSession(activeSession.id);
        setCurrentPO(null);
        resetFormState();
      }
    } else {
      if (activeTransferSession) {
        toast.message("Transfer receiving session paused");
        setActiveTransferSession(null);
        setCurrentTransfer(null);
        setTransferReceivedItems([]);
        resetFormState();
      }
    }
  };

  const activeSessionContext = useMemo(() => {
    if (receivingType === "purchase_order" && activeSession && currentPO) {
      const status = currentPO.status;
      return {
        session: activeSession,
        title: currentPO.po_number,
        subtitle: currentPO.customers?.name,
        badge: {
          label: status?.replace(/_/g, " ") || "In Progress",
          variant: status ? PO_BADGE_VARIANTS[status] : undefined
        },
        metadata: [
          { label: "Vendor", value: currentPO.vendor_name },
          {
            label: "Expected",
            value: currentPO.expected_date ? format(new Date(currentPO.expected_date), "MMM d, yyyy") : undefined
          }
        ]
      };
    }

    if (receivingType === "transfer_order" && activeTransferSession && currentTransfer) {
      const status = currentTransfer.status;
      return {
        session: activeTransferSession,
        title: currentTransfer.transfer_number,
        subtitle: currentTransfer.destination_warehouse?.name || currentTransfer.destination_warehouse_id,
        badge: {
          label: status?.replace(/_/g, " ") || "In Progress",
          variant: status ? TRANSFER_BADGE_VARIANTS[status] : undefined
        },
        metadata: [
          {
            label: "Origin",
            value: currentTransfer.source_warehouse?.name || currentTransfer.source_warehouse_id
          },
          {
            label: "Destination",
            value: currentTransfer.destination_warehouse?.name || currentTransfer.destination_warehouse_id
          },
          {
            label: "Expected arrival",
            value: currentTransfer.expected_arrival ? format(new Date(currentTransfer.expected_arrival), "MMM d, yyyy") : undefined
          }
        ]
      };
    }

    return null;
  }, [receivingType, activeSession, currentPO, activeTransferSession, currentTransfer]);

  const isSessionActive = Boolean(activeSessionContext);
  const isLoading = receivingType === "purchase_order" ? poLoading : transferLoading;
  const disableTabSwitch = Boolean(activeSession || activeTransferSession);
  const receivedItemsForView = receivingType === "purchase_order" ? receivedItems : transferReceivedItems;

  const emptyStateMessage = receivingType === "purchase_order"
    ? "No pending purchase orders found."
    : "No scheduled or in-transit transfers ready to receive.";

  const description = isSessionActive
    ? "Scan items to receive"
    : receivingType === "purchase_order"
      ? "Select a purchase order to begin receiving"
      : "Select a transfer order to begin receiving";

  const showPurchaseSession = receivingType === "purchase_order" && activeSession && currentPO;
  const showTransferSession = receivingType === "transfer_order" && activeTransferSession && currentTransfer;

  return (
    <TmsLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {isSessionActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetFormState}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold">Receiving</h1>
              <p className="text-muted-foreground mt-1">{description}</p>
            </div>
          </div>

          <Tabs
            value={receivingType}
            onValueChange={(value) => {
              if (disableTabSwitch && value !== receivingType) return;
              setReceivingType(value as "purchase_order" | "transfer_order");
              resetFormState();
            }}
            className="w-full"
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="purchase_order" disabled={disableTabSwitch && receivingType !== "purchase_order"}>
                Purchase orders
              </TabsTrigger>
              <TabsTrigger value="transfer_order" disabled={disableTabSwitch && receivingType !== "transfer_order"}>
                Transfer orders
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchase_order" className="mt-6">
              {showPurchaseSession && activeSessionContext ? (
                <div className="space-y-6">
                  <ReceivingSessionHeader
                    session={activeSessionContext.session}
                    title={activeSessionContext.title}
                    subtitle={activeSessionContext.subtitle}
                    badge={activeSessionContext.badge}
                    metadata={activeSessionContext.metadata}
                    onPause={handlePause}
                    onComplete={handleComplete}
                    onCancel={handlePause}
                  />

                  {!scannedItem ? (
                    <>
                      <BarcodeScanInput
                        onScan={handleBarcodeScan}
                        disabled={isLoading}
                        placeholder="Scan purchase order item barcode..."
                      />

                      <ReceivedItemsList items={receivedItemsForView} />
                    </>
                  ) : (
                    <ReceivingItemForm
                      item={scannedItem}
                      poLineItem={selectedLineItem}
                      onReceive={handleReceiveItem}
                      onCancel={resetFormState}
                    />
                  )}
                </div>
              ) : (
                <div>
                  {isLoading && purchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading purchase orders...</p>
                    </div>
                  ) : purchaseOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">{emptyStateMessage}</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {purchaseOrders.map((po) => (
                        <POSelectionCard
                          key={po.id}
                          po={po}
                          onStartReceiving={handleStartPurchaseReceiving}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transfer_order" className="mt-6">
              {showTransferSession && activeSessionContext ? (
                <div className="space-y-6">
                  <ReceivingSessionHeader
                    session={activeSessionContext.session}
                    title={activeSessionContext.title}
                    subtitle={activeSessionContext.subtitle}
                    badge={activeSessionContext.badge}
                    metadata={activeSessionContext.metadata}
                    onPause={handlePause}
                    onComplete={handleComplete}
                    onCancel={handlePause}
                  />

                  {!scannedItem ? (
                    <>
                      <BarcodeScanInput
                        onScan={handleBarcodeScan}
                        disabled={isLoading}
                        placeholder="Scan transfer order item barcode..."
                      />

                      <ReceivedItemsList items={receivedItemsForView} />
                    </>
                  ) : (
                    <ReceivingItemForm
                      item={scannedItem}
                      poLineItem={selectedLineItem}
                      onReceive={handleReceiveItem}
                      onCancel={resetFormState}
                    />
                  )}
                </div>
              ) : (
                <div>
                  {isLoading && transferOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Loading transfer orders...</p>
                    </div>
                  ) : transferOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">{emptyStateMessage}</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {transferOrders.map((transfer) => (
                        <TransferSelectionCard
                          key={transfer.id}
                          transfer={transfer}
                          onStartReceiving={handleStartTransferReceiving}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TmsLayout>
  );
};

export default Receiving;
