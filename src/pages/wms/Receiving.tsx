import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
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

  const [searchParams, setSearchParams] = useSearchParams();
  const autoStartRef = useRef<string | null>(null);

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

  // Auto-start receiving when navigated with ?poId=...
  useEffect(() => {
    const poId = searchParams.get('poId');
    if (!poId || activeSession || autoStartRef.current === poId) return;
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;
    autoStartRef.current = poId;
    handleStartReceiving(poId, po.warehouse_id);
    searchParams.delete('poId');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, purchaseOrders, activeSession]);

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

  const handleSelectLineForReceive = (poLineItem: any) => {
    if (!poLineItem?.items) return;
    setScannedItem(poLineItem.items);
    setSelectedPOLineItem(poLineItem);
  };

  const handleReceiveItem = async (data: {
    uom: string;
    quantity: number;
    damagedQuantity: number;
    nonCompliantQuantity: number;
    nonComplianceReason?: string;
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
      damagedQuantity: data.damagedQuantity,
      nonCompliantQuantity: data.nonCompliantQuantity,
      nonComplianceReason: data.nonComplianceReason,
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

  const totalUnits = purchaseOrders.reduce((sum, po) => {
    return sum + (po.po_line_items || []).reduce((s: number, l: any) => {
      return s + Math.max((l.quantity_ordered || 0) - (l.quantity_received || 0), 0);
    }, 0);
  }, 0);
  const partialCount = purchaseOrders.filter((po) => po.status === 'partially_received').length;

  return (
    <TmsLayout>
      <div className="space-y-6">
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Receiving</h1>
            <p className="text-muted-foreground mt-1">
              {activeSession ? 'Scan items to receive' : 'Select a purchase order to begin receiving inventory'}
            </p>
          </div>
        </div>

        {/* Active Session View */}
        {activeSession && currentPO ? (
          <div className="space-y-6 max-w-4xl">
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

                <div className="border rounded-lg">
                  <div className="p-3 border-b bg-muted/50 font-medium">PO Line Items</div>
                  <div className="divide-y">
                    {currentPO.po_line_items?.map((line: any) => {
                      const remaining = Math.max((line.quantity_ordered || 0) - (line.quantity_received || 0), 0);
                      return (
                        <div key={line.id} className="p-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{line.items?.name || line.product_name}</p>
                            <p className="text-sm text-muted-foreground">SKU: {line.items?.sku || line.sku}</p>
                            <p className="text-sm text-muted-foreground">
                              Ordered: {line.quantity_ordered} | Received: {line.quantity_received || 0} | Remaining: {remaining}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            disabled={remaining <= 0 || loading}
                            onClick={() => handleSelectLineForReceive(line)}
                          >
                            Receive Qty
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
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
          <div className="space-y-6">
            {/* Summary stats */}
            {purchaseOrders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Open POs</p>
                  <p className="text-2xl font-semibold mt-1 tabular-nums">{purchaseOrders.length}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Units Pending</p>
                  <p className="text-2xl font-semibold mt-1 tabular-nums">{totalUnits.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Partially Received</p>
                  <p className="text-2xl font-semibold mt-1 tabular-nums">{partialCount}</p>
                </div>
              </div>
            )}

            {loading && purchaseOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg">
                <p className="text-muted-foreground">Loading purchase orders...</p>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-16 border border-dashed rounded-lg">
                <p className="text-foreground font-medium">No pending purchase orders</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Create a PO to start receiving inventory.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
