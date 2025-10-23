import { useState } from "react";
import { TmsLayout } from "@/components/layout/TmsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { 
  Store, 
  Settings, 
  Package, 
  Truck, 
  CheckCircle2, 
  ArrowRight,
  ShoppingCart,
  Tag,
  BarChart3
} from "lucide-react";
import { ShopifyConnectionButton } from "@/components/integrations/ShopifyConnectionButton";

const OnboardingStep = ({ 
  number, 
  title, 
  description, 
  icon: Icon, 
  action, 
  actionLabel,
  isActive,
  isCompleted,
  onClick 
}: any) => (
  <Card 
    className={`cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary shadow-lg' : ''} ${isCompleted ? 'border-green-500' : ''}`}
    onClick={onClick}
  >
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
            {isCompleted ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">Step {number}</Badge>
              {isCompleted && <Badge variant="default" className="bg-green-500">Completed</Badge>}
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </div>
      </div>
    </CardHeader>
    {isActive && action && (
      <CardContent>
        <div className="flex items-center gap-4">
          {action}
        </div>
      </CardContent>
    )}
  </Card>
);

export default function Onboarding() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      number: 1,
      title: "Connect Your Shopify Store",
      description: "Securely connect Ship Tornado to your Shopify store via OAuth. This enables automatic order syncing and fulfillment updates.",
      icon: Store,
      action: <ShopifyConnectionButton />,
      actionLabel: "Connect Shopify"
    },
    {
      number: 2,
      title: "Configure Integration Settings",
      description: "Set up automatic order syncing, fulfillment updates, and inventory management. Choose which order statuses to sync and how to handle fulfillments.",
      icon: Settings,
      action: (
        <Button onClick={() => navigate('/company-admin')}>
          Open Settings <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
      actionLabel: "Configure Settings"
    },
    {
      number: 3,
      title: "View Synced Orders",
      description: "Orders from your Shopify store automatically appear in Ship Tornado. View order details, customer information, and items ready to ship.",
      icon: ShoppingCart,
      action: (
        <Button onClick={() => navigate('/orders')}>
          View Orders <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
      actionLabel: "View Orders"
    },
    {
      number: 4,
      title: "Process & Ship Orders",
      description: "Use intelligent cartonization to optimize packaging, compare rates across carriers, and purchase shipping labels. Ship Tornado handles the complexity.",
      icon: Package,
      action: (
        <div className="flex gap-2">
          <Button onClick={() => navigate('/orders/bulk-ship')}>
            Bulk Ship Orders <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/shipments/create')}>
            Create Shipment
          </Button>
        </div>
      ),
      actionLabel: "Process Orders"
    },
    {
      number: 5,
      title: "Automatic Fulfillment Sync",
      description: "When you ship an order, tracking information automatically updates in Shopify. Your customers receive tracking notifications seamlessly.",
      icon: Truck,
      action: (
        <Button onClick={() => navigate('/shipments')}>
          View Shipments <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
      actionLabel: "View Fulfillments"
    },
    {
      number: 6,
      title: "Explore Advanced Features",
      description: "Discover Item Master for product management, packaging intelligence for cost optimization, and analytics to track your shipping performance.",
      icon: BarChart3,
      action: (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/item-master')}>
            <Tag className="mr-2 h-4 w-4" /> Item Master
          </Button>
          <Button variant="outline" onClick={() => navigate('/packaging')}>
            <Package className="mr-2 h-4 w-4" /> Packaging Intelligence
          </Button>
          <Button onClick={() => navigate('/')}>
            <BarChart3 className="mr-2 h-4 w-4" /> Dashboard
          </Button>
        </div>
      ),
      actionLabel: "Explore Features"
    }
  ];

  const progress = (completedSteps.length / steps.length) * 100;

  const handleStepClick = (stepNumber: number) => {
    setActiveStep(stepNumber);
  };

  const markStepComplete = (stepNumber: number) => {
    if (!completedSteps.includes(stepNumber)) {
      setCompletedSteps([...completedSteps, stepNumber]);
      if (stepNumber < steps.length) {
        setActiveStep(stepNumber + 1);
      }
    }
  };

  return (
    <TmsLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Ship Tornado</h1>
          <p className="text-xl text-muted-foreground">
            Let's get your Shopify store connected and start shipping smarter
          </p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Setup Progress</span>
                <span className="text-muted-foreground">
                  {completedSteps.length} of {steps.length} steps completed
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Steps */}
        <div className="space-y-4">
          {steps.map((step) => (
            <OnboardingStep
              key={step.number}
              {...step}
              isActive={activeStep === step.number}
              isCompleted={completedSteps.includes(step.number)}
              onClick={() => handleStepClick(step.number)}
            />
          ))}
        </div>

        {/* Completion Card */}
        {completedSteps.length === steps.length && (
          <Card className="border-green-500 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100 text-green-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle className="text-2xl">All Set! 🎉</CardTitle>
                  <CardDescription className="text-base">
                    You've completed the onboarding. Your Ship Tornado integration is ready to streamline your shipping operations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => navigate('/')}>
                Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Jump to any feature at any time during your demo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => navigate('/')} className="justify-start">
                Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('/orders')} className="justify-start">
                Orders
              </Button>
              <Button variant="outline" onClick={() => navigate('/shipments')} className="justify-start">
                Shipments
              </Button>
              <Button variant="outline" onClick={() => navigate('/company-admin')} className="justify-start">
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </TmsLayout>
  );
}
