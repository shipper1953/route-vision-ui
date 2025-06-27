
import { useState, useEffect } from "react";
import { TrendingUp, AlertCircle } from "lucide-react";
import { useCartonization } from "@/hooks/useCartonization";
import { BoxRecommendationsList } from "./BoxRecommendationsList";
import { analyzeBoxRecommendations, BoxRecommendation } from "./boxRecommendationUtils";

export const BoxRecommendations = () => {
  const [recommendations, setRecommendations] = useState<BoxRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { boxes, createItemsFromOrderData, parameters } = useCartonization();

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        const recs = await analyzeBoxRecommendations(boxes, parameters, createItemsFromOrderData);
        setRecommendations(recs);
      } catch (error) {
        console.error('Error analyzing box recommendations:', error);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [boxes, parameters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-tms-blue" />
        <h2 className="text-xl font-semibold">Top 5 Box Recommendations</h2>
      </div>

      <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg border">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p>
            Based on your recent orders, these boxes would provide better fit and cost efficiency than your current inventory. 
            Recommendations are based on Uline ECT-32 equivalent catalog options.
          </p>
        </div>
      </div>

      <BoxRecommendationsList recommendations={recommendations} loading={loading} />
    </div>
  );
};
