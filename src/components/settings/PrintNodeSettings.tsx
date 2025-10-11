import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { usePrintNode } from "@/hooks/usePrintNode";
import { RefreshCw, Printer, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const PrintNodeSettings = () => {
  const { printers, selectedPrinter, setSelectedPrinter, loading, loadPrinters } = usePrintNode();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Printer Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Configure your PrintNode printers for direct label printing
        </p>
      </div>

      {printers.length === 0 && !loading && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No printers found. Make sure you have:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>PrintNode client installed and running</li>
              <li>Valid PRINTNODE_API_KEY configured</li>
              <li>At least one printer connected</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Available Printers</CardTitle>
            <CardDescription>
              Select your default printer for shipping labels and barcodes
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPrinters}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading && printers.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Loading printers...
            </div>
          ) : (
            <RadioGroup
              value={selectedPrinter?.toString()}
              onValueChange={(value) => setSelectedPrinter(parseInt(value))}
              className="space-y-3"
            >
              {printers.map((printer) => (
                <div
                  key={printer.id}
                  className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem value={printer.id.toString()} id={`printer-${printer.id}`} />
                  <div className="flex-1">
                    <Label
                      htmlFor={`printer-${printer.id}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      <span className="font-medium">{printer.name}</span>
                      {printer.default && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          PrintNode Default
                        </span>
                      )}
                    </Label>
                    {printer.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {printer.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        printer.state === 'online' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {printer.state}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
