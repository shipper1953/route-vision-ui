import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCartonization } from "@/hooks/useCartonization";
import { Box } from "@/services/cartonization/types";

interface BoxSelectorProps {
  onSelectBox: (box: Box) => void;
  selectedBox?: Box | null;
}

export const BoxSelector = ({ onSelectBox, selectedBox }: BoxSelectorProps) => {
  const { boxes } = useCartonization();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredBoxes = boxes.filter(box => 
    box.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    box.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectBox = (box: Box) => {
    onSelectBox(box);
    setIsOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Box Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedBox && (
          <div className="mb-4 p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{selectedBox.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedBox.length}" × {selectedBox.width}" × {selectedBox.height}"
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{selectedBox.type}</Badge>
                  <Badge variant="outline">{selectedBox.inStock} in stock</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              {selectedBox ? 'Change Box' : 'Select Box from Inventory'}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select Package from Inventory</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search boxes by name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredBoxes.map((box) => (
                  <Card 
                    key={box.id} 
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      selectedBox?.id === box.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectBox(box)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{box.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            ${box.cost.toFixed(2)}
                          </Badge>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {box.length}" × {box.width}" × {box.height}"
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          Max: {box.maxWeight} lbs
                        </div>
                        
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {box.type.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant={box.inStock > 0 ? "default" : "destructive"} 
                            className="text-xs"
                          >
                            {box.inStock} stock
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredBoxes.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No boxes found matching your search.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};