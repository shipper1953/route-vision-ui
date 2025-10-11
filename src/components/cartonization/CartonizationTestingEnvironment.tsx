
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Play, Loader2, CheckCircle, History } from "lucide-react";
import { CartonizationEngine, Item } from "@/services/cartonization/cartonizationEngine";
import { useCartonization } from "@/hooks/useCartonization";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TestScenario {
  orderId: string;
  items: Array<{
    sku: string;
    quantity: number;
    dimensions: string;
    weight: string;
  }>;
  destination: string;
  carrier: string;
  serviceLevel: string;
}

interface TestResult {
  recommendation: {
    packageType: string;
    materials: string[];
    estimatedCost: string;
    dimensionalWeight: string;
    confidence: number;
  };
  rulesApplied: string[];
  metrics: {
    processingTime: string;
    rulesEvaluated: number;
    alternativesConsidered: number;
  };
}

export const CartonizationTestingEnvironment = () => {
  const { boxes, parameters } = useCartonization();
  const { userProfile } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [selectedOrderMode, setSelectedOrderMode] = useState<string>('custom');
  
  const [testScenario, setTestScenario] = useState<TestScenario>({
    orderId: 'custom',
    items: [],
    destination: 'US-CA-90210',
    carrier: 'fedex',
    serviceLevel: 'ground'
  });

  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [historicalResults, setHistoricalResults] = useState<any[]>([]);

  // Fetch open orders and available items
  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.company_id) return;

      try {
        // Fetch ready to ship orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_id, customer_name, items, shipping_address')
          .eq('company_id', userProfile.company_id)
          .eq('status', 'ready_to_ship')
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;
        setOrders(ordersData || []);

        // Fetch available items
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('company_id', userProfile.company_id)
          .eq('is_active', true)
          .order('name');

        if (itemsError) throw itemsError;
        setAvailableItems(itemsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load orders and items');
      }
    };

    fetchData();
  }, [userProfile?.company_id]);

  const runTest = async () => {
    setIsRunning(true);
    
    try {
      // Convert test scenario to items
      const items: Item[] = testScenario.items.map((item, index) => {
        const [length, width, height] = item.dimensions.split('x').map(d => parseFloat(d.trim()));
        return {
          id: `test-item-${index}`,
          name: item.sku,
          length: length || 6,
          width: width || 4,
          height: height || 2,
          weight: parseFloat(item.weight) || 1,
          quantity: item.quantity
        };
      });

      // Create engine with current parameters
      const engine = new CartonizationEngine(boxes, parameters);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = engine.calculateOptimalBox(items);
      
      if (!result) {
        toast.error('No suitable packaging found for this scenario');
        return;
      }

      const newTestResult = {
        recommendation: {
          packageType: result.recommendedBox.name,
          materials: ['Bubble Wrap', 'Packing Paper'],
          estimatedCost: `$${result.recommendedBox.cost.toFixed(2)}`,
          dimensionalWeight: `${result.dimensionalWeight.toFixed(1)} lbs`,
          confidence: result.confidence
        },
        rulesApplied: result.rulesApplied,
        metrics: {
          processingTime: `${result.processingTime}ms`,
          rulesEvaluated: result.rulesApplied.length,
          alternativesConsidered: result.alternatives.length
        }
      };
      
      setTestResults(newTestResult);

      // Add to historical results
      const historicalEntry = {
        id: Date.now(),
        orderId: testScenario.orderId,
        timestamp: new Date().toLocaleString(),
        rules: result.rulesApplied.join(', '),
        recommendation: result.recommendedBox.name,
        actualPackaging: '-',
        accuracy: result.confidence,
        cost: `$${result.recommendedBox.cost.toFixed(2)}`
      };
      
      setHistoricalResults(prev => [historicalEntry, ...prev]);

      toast.success('Test completed successfully');
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test failed. Please check your configuration.');
    } finally {
      setIsRunning(false);
    }
  };

  const addItem = () => {
    setTestScenario(prev => ({
      ...prev,
      items: [...prev.items, { sku: '', quantity: 1, dimensions: '', weight: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setTestScenario(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    setTestScenario(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleOrderSelection = (orderId: string) => {
    setSelectedOrderMode(orderId);
    
    if (orderId === 'custom') {
      // Reset to custom mode
      setTestScenario(prev => ({
        ...prev,
        orderId: 'custom',
        items: []
      }));
    } else {
      // Load order items
      const selectedOrder = orders.find(o => o.id.toString() === orderId);
      if (selectedOrder && selectedOrder.items) {
        const orderItems = Array.isArray(selectedOrder.items) ? selectedOrder.items : [];
        const formattedItems = orderItems.map((item: any) => {
          // Look up item from available items to get dimensions
          const masterItem = availableItems.find(
            ai => ai.sku === item.sku || ai.name === item.name || ai.sku === item.name
          );
          
          return {
            sku: item.name || item.sku || 'Unknown',
            quantity: item.quantity || 1,
            dimensions: masterItem 
              ? `${masterItem.length}x${masterItem.width}x${masterItem.height}`
              : `${item.length || 0}x${item.width || 0}x${item.height || 0}`,
            weight: masterItem 
              ? masterItem.weight.toString() 
              : (item.weight || 0).toString()
          };
        });

        setTestScenario(prev => ({
          ...prev,
          orderId: selectedOrder.order_id || orderId,
          items: formattedItems
        }));
      }
    }
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selectedItem = availableItems.find(i => i.id === itemId);
    if (selectedItem) {
      updateItem(index, 'sku', selectedItem.name);
      updateItem(index, 'dimensions', `${selectedItem.length}x${selectedItem.width}x${selectedItem.height}`);
      updateItem(index, 'weight', selectedItem.weight.toString());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rule Testing Environment</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orderId">Order Selection</Label>
              <Select value={selectedOrderMode} onValueChange={handleOrderSelection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order or custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom (Add Items Manually)</SelectItem>
                  {orders.map(order => (
                    <SelectItem key={order.id} value={order.id.toString()}>
                      {order.order_id} - {order.customer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Items</Label>
              <div className="space-y-3">
                {testScenario.items.map((item, index) => (
                  <div key={index} className="space-y-2 p-3 bg-muted/50 rounded">
                    {selectedOrderMode === 'custom' && (
                      <Select onValueChange={(value) => handleItemSelect(index, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an item" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableItems.map(availItem => (
                            <SelectItem key={availItem.id} value={availItem.id}>
                              {availItem.name} ({availItem.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="SKU"
                        value={item.sku}
                        onChange={(e) => updateItem(index, 'sku', e.target.value)}
                        className="flex-1"
                        disabled={selectedOrderMode !== 'custom'}
                      />
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16"
                      />
                      <Input
                        placeholder="L×W×H"
                        value={item.dimensions}
                        onChange={(e) => updateItem(index, 'dimensions', e.target.value)}
                        className="w-24"
                        disabled={selectedOrderMode !== 'custom'}
                      />
                      <Input
                        placeholder="Weight"
                        value={item.weight}
                        onChange={(e) => updateItem(index, 'weight', e.target.value)}
                        className="w-20"
                        disabled={selectedOrderMode !== 'custom'}
                      />
                      {selectedOrderMode === 'custom' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {selectedOrderMode === 'custom' && (
                  <Button
                    variant="outline"
                    onClick={addItem}
                    className="w-full border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Destination</Label>
                <Select
                  value={testScenario.destination}
                  onValueChange={(value) => setTestScenario(prev => ({ ...prev, destination: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US-CA-90210">US-CA-90210</SelectItem>
                    <SelectItem value="US-NY-10001">US-NY-10001</SelectItem>
                    <SelectItem value="US-TX-77001">US-TX-77001</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carrier</Label>
                <Select
                  value={testScenario.carrier}
                  onValueChange={(value) => setTestScenario(prev => ({ ...prev, carrier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="ups">UPS</SelectItem>
                    <SelectItem value="usps">USPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={runTest}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700">Test Completed</span>
                  </div>
                  <p className="text-sm text-green-700">Confidence: {testResults.recommendation.confidence}%</p>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Recommendation</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Package Type:</span>
                      <span>{testResults.recommendation.packageType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Materials:</span>
                      <span>{testResults.recommendation.materials.join(', ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estimated Cost:</span>
                      <span>{testResults.recommendation.estimatedCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dimensional Weight:</span>
                      <span>{testResults.recommendation.dimensionalWeight}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Rules Applied</h5>
                  <div className="space-y-1">
                    {testResults.rulesApplied.map((rule, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-muted-foreground">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">Performance Metrics</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Time:</span>
                      <span>{testResults.metrics.processingTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rules Evaluated:</span>
                      <span>{testResults.metrics.rulesEvaluated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alternatives:</span>
                      <span>{testResults.metrics.alternativesConsidered}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="h-12 w-12 mx-auto mb-4 opacity-50">🧪</div>
                <p className="text-muted-foreground">Configure test parameters and run a test to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historical Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Order ID</th>
                  <th className="text-left py-2 font-medium">Timestamp</th>
                  <th className="text-left py-2 font-medium">Rules Applied</th>
                  <th className="text-left py-2 font-medium">Recommendation</th>
                  <th className="text-left py-2 font-medium">Actual</th>
                  <th className="text-left py-2 font-medium">Accuracy</th>
                  <th className="text-left py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {historicalResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No test results yet. Run a test to see results here.
                    </td>
                  </tr>
                ) : (
                  historicalResults.map((test) => (
                  <tr key={test.id} className="border-b">
                    <td className="py-3">{test.orderId}</td>
                    <td className="py-3 text-muted-foreground">{test.timestamp}</td>
                    <td className="py-3 text-muted-foreground">{test.rules}</td>
                    <td className="py-3 text-muted-foreground">{test.recommendation}</td>
                    <td className="py-3 text-muted-foreground">{test.actualPackaging}</td>
                    <td className="py-3">
                      <Badge variant={test.accuracy >= 90 ? "default" : test.accuracy >= 75 ? "secondary" : "destructive"}>
                        {test.accuracy}%
                      </Badge>
                    </td>
                    <td className="py-3">{test.cost}</td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
