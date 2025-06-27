
import React, { useState } from 'react';
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
  
  const [testScenario, setTestScenario] = useState<TestScenario>({
    orderId: 'ORD-2024-001',
    items: [
      { sku: 'WIDGET-001', quantity: 2, dimensions: '10x8x3', weight: '0.5' },
      { sku: 'GADGET-002', quantity: 1, dimensions: '15x12x5', weight: '1.2' }
    ],
    destination: 'US-CA-90210',
    carrier: 'fedex',
    serviceLevel: 'ground'
  });

  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const [historicalData] = useState([
    {
      id: 1,
      orderId: 'ORD-2024-001',
      timestamp: '2024-01-20 14:30',
      rules: 'Standard + Amazon FBA',
      recommendation: '12x10x8 Box + Bubble Wrap',
      actualPackaging: '12x10x8 Box + Bubble Wrap',
      accuracy: 100,
      cost: '$2.45'
    },
    {
      id: 2,
      orderId: 'ORD-2024-002',
      timestamp: '2024-01-20 14:25',
      rules: 'Standard + Dimensional Weight',
      recommendation: '14x12x6 Box + Air Pillows',
      actualPackaging: '16x14x8 Box + Bubble Wrap',
      accuracy: 75,
      cost: '$3.20'
    }
  ]);

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

      setTestResults({
        recommendation: {
          packageType: result.recommendedBox.name,
          materials: ['Bubble Wrap', 'Packing Paper'], // Would come from box configuration
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
      });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Rule Testing Environment</h3>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Load Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                value={testScenario.orderId}
                onChange={(e) => setTestScenario(prev => ({ ...prev, orderId: e.target.value }))}
              />
            </div>

            <div>
              <Label>Items</Label>
              <div className="space-y-3">
                {testScenario.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-muted/50 rounded">
                    <Input
                      placeholder="SKU"
                      value={item.sku}
                      onChange={(e) => updateItem(index, 'sku', e.target.value)}
                      className="flex-1"
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
                    />
                    <Input
                      placeholder="Weight"
                      value={item.weight}
                      onChange={(e) => updateItem(index, 'weight', e.target.value)}
                      className="w-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  onClick={addItem}
                  className="w-full border-dashed"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
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
                {historicalData.map((test) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
