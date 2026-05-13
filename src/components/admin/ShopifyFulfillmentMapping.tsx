import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Wrench } from "lucide-react";

interface StoreRow {
  id: string;
  company_id: string;
  store_name: string | null;
  store_url: string;
  is_active: boolean;
  fulfillment_service_id: string | null;
  fulfillment_location_id: string | null;
  fulfillment_location_name: string | null;
  fulfillment_service_location_id: string | null;
  company_name?: string;
}

interface VerifyResult {
  status: "ok" | "missing" | "mismatch" | "error";
  liveLocationId?: string;
  liveLocationName?: string;
  message?: string;
}

const normalizeId = (v?: string | null) =>
  (v || "").toString().split("/").pop() || "";

export const ShopifyFulfillmentMapping = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, "verify" | "fix" | undefined>>({});
  const [results, setResults] = useState<Record<string, VerifyResult>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shopify_stores")
      .select("id, company_id, store_name, store_url, is_active, fulfillment_service_id, fulfillment_location_id, fulfillment_location_name, fulfillment_service_location_id")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load stores", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data || []) as StoreRow[];
    const companyIds = Array.from(new Set(rows.map((r) => r.company_id).filter(Boolean)));
    let companyMap: Record<string, string> = {};
    if (companyIds.length) {
      const { data: comps } = await supabase
        .from("companies")
        .select("id, name")
        .in("id", companyIds);
      companyMap = Object.fromEntries((comps || []).map((c: any) => [c.id, c.name]));
    }
    setStores(rows.map((s) => ({ ...s, company_name: companyMap[s.company_id] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const verify = async (store: StoreRow) => {
    setBusy((b) => ({ ...b, [store.id]: "verify" }));
    try {
      const { data, error } = await supabase.functions.invoke("shopify-list-locations", {
        body: { companyId: store.company_id },
      });
      if (error) throw error;
      const locations: Array<{ id: string; name: string; storeId: string }> =
        (data?.locations || []).filter((l: any) => l.storeId === store.id);

      const tornado = locations.find((l) => /ship\s*tornado/i.test(l.name));

      if (!tornado) {
        setResults((r) => ({
          ...r,
          [store.id]: {
            status: "missing",
            message: "No 'Ship Tornado' fulfillment location found in Shopify",
          },
        }));
      } else {
        const stored = normalizeId(store.fulfillment_location_id);
        const live = normalizeId(tornado.id);
        if (!stored) {
          setResults((r) => ({
            ...r,
            [store.id]: {
              status: "mismatch",
              liveLocationId: tornado.id,
              liveLocationName: tornado.name,
              message: "Live location exists but DB mapping is empty",
            },
          }));
        } else if (stored !== live) {
          setResults((r) => ({
            ...r,
            [store.id]: {
              status: "mismatch",
              liveLocationId: tornado.id,
              liveLocationName: tornado.name,
              message: `DB location (${stored}) differs from live (${live})`,
            },
          }));
        } else {
          setResults((r) => ({
            ...r,
            [store.id]: {
              status: "ok",
              liveLocationId: tornado.id,
              liveLocationName: tornado.name,
            },
          }));
        }
      }
    } catch (e: any) {
      setResults((r) => ({ ...r, [store.id]: { status: "error", message: e.message } }));
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [store.id]: undefined }));
    }
  };

  const fix = async (store: StoreRow) => {
    setBusy((b) => ({ ...b, [store.id]: "fix" }));
    try {
      const { data, error } = await supabase.functions.invoke("shopify-register-fulfillment-service", {
        body: { companyId: store.company_id, storeId: store.id },
      });
      if (error) throw error;
      toast({
        title: "Fulfillment service mapped",
        description: data?.fulfillmentService?.locationName
          ? `Linked to ${data.fulfillmentService.locationName}`
          : "Mapping updated",
      });
      await load();
      await verify({
        ...store,
        fulfillment_location_id: data?.fulfillmentService?.locationId || store.fulfillment_location_id,
      });
    } catch (e: any) {
      toast({ title: "Fix failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy((b) => ({ ...b, [store.id]: undefined }));
    }
  };

  const renderStatus = (store: StoreRow) => {
    const r = results[store.id];
    if (!r) {
      if (!store.fulfillment_location_id) {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Not mapped
          </Badge>
        );
      }
      return <Badge variant="secondary">Unverified</Badge>;
    }
    if (r.status === "ok")
      return (
        <Badge className="gap-1 bg-green-600 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3" /> Matches
        </Badge>
      );
    if (r.status === "missing")
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Missing in Shopify
        </Badge>
      );
    if (r.status === "mismatch")
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" /> Mismatch
        </Badge>
      );
    return <Badge variant="destructive">Error</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Shopify Fulfillment Service Mapping</CardTitle>
          <CardDescription>
            Verify each Shopify store is linked to its "Ship Tornado" fulfillment-service location.
            Use Fix to register or repair the mapping.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Reload
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : stores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Shopify stores found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company / Store</TableHead>
                <TableHead>Stored Location</TableHead>
                <TableHead>Live Result</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((s) => {
                const r = results[s.id];
                const isBusy = busy[s.id];
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.company_name || s.company_id}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.store_name || s.store_url}
                        {!s.is_active && <span className="ml-2 text-destructive">(inactive)</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.fulfillment_location_name || "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono break-all">
                        {normalizeId(s.fulfillment_location_id) || "no location id"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        svc: {normalizeId(s.fulfillment_service_id) || "—"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r?.liveLocationName ? (
                        <>
                          <div className="text-sm">{r.liveLocationName}</div>
                          <div className="text-xs text-muted-foreground font-mono break-all">
                            {normalizeId(r.liveLocationId)}
                          </div>
                        </>
                      ) : r?.message ? (
                        <span className="text-xs text-muted-foreground">{r.message}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not checked</span>
                      )}
                    </TableCell>
                    <TableCell>{renderStatus(s)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!isBusy}
                        onClick={() => verify(s)}
                      >
                        {isBusy === "verify" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        disabled={!!isBusy}
                        onClick={() => fix(s)}
                      >
                        {isBusy === "fix" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Wrench className="h-3 w-3 mr-1" /> Fix
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ShopifyFulfillmentMapping;
