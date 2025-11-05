import { useState, useEffect } from "react";
import { useWmsReceiving } from "@/hooks/useWmsReceiving";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { POSelectionCard } from "@/components/wms/receiving/POSelectionCard";
import { ReceivingSessionHeader } from "@/components/wms/receiving/ReceivingSessionHeader";
import { BarcodeScanInput } from "@/components/wms/receiving/BarcodeScanInput";
import { ReceivingItemForm } from "@/components/wms/receiving/ReceivingItemForm";
import { ReceivedItemsList } from "@/components/wms/receiving/ReceivedItemsList";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Receiving = () => {
  const {
    loading,
    purchaseOrders,
    activeSession,
    receivedItems,
    createReceivingSession,
    receiveItem,
    fetchReceivedItems,
    completeReceivingSession,
    pauseReceivingSession
  } = useWmsReceiving();

  const [scannedItem, setScannedItem] = useState<any>(null);
  const [selectedPOLineItem, setSelectedPOLineItem] = useState<any>(null);
  const [currentPO, setCurrentPO] = useState<any>(null);

  useEffect(() => {
    if (activeSession) {
      fetchReceivedItems(activeSession.id);
      const po = purchaseOrders.find(p => p.id === activeSession.po_id);
      setCurrentPO(po);
    }
  }, [activeSession]);

  const handleStartReceiving = async (poId: string, warehouseId: string) => {
    const session = await createReceivingSession(poId, warehouseId);
    if (session) {
      const po = purchaseOrders.find(p => p.id === poId);
      setCurrentPO(po);
    }
  };

  const handleBarcodeScan = (barcode: string) => {
    if (!currentPO) return;

    // Find item in PO line items
    const poLineItem = currentPO.po_line_items?.find((line: any) => {
      const item = line.items;
      const uomConfig = item?.uom_config || {};
      
      // Check all UOM barcodes
      return Object.values(uomConfig).some((uom: any) => 
        uom?.barcode?.toLowerCase() === barcode.toLowerCase()
      ) || item?.sku?.toLowerCase() === barcode.toLowerCase();
    });

    if (poLineItem) {
      setScannedItem(poLineItem.items);
      setSelectedPOLineItem(poLineItem);
    } else {
      // TODO: Show "Item not found in PO" message or prompt for Qboid
      console.log('Item not found in PO:', barcode);
    }
  };

  const handleReceiveItem = async (data: {
    uom: string;
    quantity: number;
    lotNumber?: string;
    serialNumbers?: string[];
    condition: string;
  }) => {
    if (!activeSession || !scannedItem || !selectedPOLineItem) return;

    await receiveItem({
      sessionId: activeSession.id,
      poLineId: selectedPOLineItem.id,
      itemId: scannedItem.id,
      uom: data.uom,
      quantityReceived: data.quantity,
      lotNumber: data.lotNumber,
      serialNumbers: data.serialNumbers,
      condition: data.condition,
      qcRequired: false
    });

    // Reset form
    setScannedItem(null);
    setSelectedPOLineItem(null);
  };

  const handleComplete = async () => {
    if (activeSession && confirm('Complete this receiving session?')) {
      await completeReceivingSession(activeSession.id);
      setCurrentPO(null);
      setScannedItem(null);
      setSelectedPOLineItem(null);
    }
  };

  const handlePause = async () => {
    if (activeSession) {
      await pauseReceivingSession(activeSession.id);
      setCurrentPO(null);
      setScannedItem(null);
      setSelectedPOLineItem(null);
    }
  };

  return (
    <TmsLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          {activeSession && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setScannedItem(null);
                setSelectedPOLineItem(null);
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold">Receiving</h1>
            <p className="text-muted-foreground mt-1">
              {activeSession ? 'Scan items to receive' : 'Select a PO to begin receiving'}
            </p>
          </div>
        </div>

        {/* Active Session View */}
        {activeSession && currentPO ? (
          <div className="space-y-6">
            <ReceivingSessionHeader
              session={activeSession}
              poData={currentPO}
              onPause={handlePause}
              onComplete={handleComplete}
              onCancel={handlePause}
            />

            {!scannedItem ? (
              <>
                <BarcodeScanInput
                  onScan={handleBarcodeScan}
                  disabled={loading}
                  placeholder="Scan item barcode..."
                />
                
                <ReceivedItemsList items={receivedItems} />
              </>
            ) : (
              <ReceivingItemForm
                item={scannedItem}
                poLineItem={selectedPOLineItem}
                onReceive={handleReceiveItem}
                onCancel={() => {
                  setScannedItem(null);
                  setSelectedPOLineItem(null);
                }}
              />
            )}
          </div>
        ) : (
          /* PO Selection View */
          <div>
            {loading && purchaseOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading purchase orders...</p>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No pending purchase orders found.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {purchaseOrders.map((po) => (
                  <POSelectionCard
                    key={po.id}
                    po={po}
                    onStartReceiving={handleStartReceiving}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </TmsLayout>
  );
};

export default Receiving;
