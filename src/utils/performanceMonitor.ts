/**
 * Performance Monitoring Utility
 * 
 * Provides lightweight performance tracking for critical operations
 * to help identify bottlenecks and track optimization improvements.
 */

import { supabase } from "@/integrations/supabase/client";

const DEBUG_ENABLED = import.meta.env.VITE_DEBUG_PERFORMANCE === 'true' || import.meta.env.DEV;

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  
  /**
   * Start timing an operation
   */
  start(operation: string): void {
    this.metrics.set(operation, performance.now());
  }
  
  /**
   * End timing an operation and log/track the result
   */
  async end(operation: string, metadata?: Record<string, any>): Promise<number> {
    const startTime = this.metrics.get(operation);
    if (!startTime) {
      console.warn(`Performance monitor: No start time found for operation "${operation}"`);
      return 0;
    }
    
    const duration = performance.now() - startTime;
    this.metrics.delete(operation);
    
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    };
    
    // Log to console in debug mode
    if (DEBUG_ENABLED) {
      console.log(`⏱️ [Performance] ${operation}: ${duration.toFixed(2)}ms`, metadata || '');
    }
    
    // Track in analytics_events for long-term monitoring
    // Only track operations that take longer than 100ms to avoid noise
    if (duration > 100) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from('analytics_events').insert({
          event_type: 'performance_metric',
          user_id: user?.id || null,
          payload: {
            operation,
            duration_ms: Math.round(duration),
            ...metadata
          }
        });
      } catch (error) {
        // Silently fail - don't break app if analytics fails
        if (DEBUG_ENABLED) {
          console.error('Failed to log performance metric:', error);
        }
      }
    }
    
    return duration;
  }
  
  /**
   * Convenience method to measure an async operation
   */
  async measure<T>(
    operation: string, 
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    this.start(operation);
    try {
      const result = await fn();
      await this.end(operation, metadata);
      return result;
    } catch (error) {
      await this.end(operation, { ...metadata, error: true });
      throw error;
    }
  }
  
  /**
   * Get average duration for an operation (from recent metrics in memory)
   */
  getAverageDuration(operation: string): number | null {
    // This would need a more sophisticated implementation with a rolling buffer
    // For now, just return null
    return null;
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export convenience functions
export const startPerformanceTimer = (operation: string) => performanceMonitor.start(operation);
export const endPerformanceTimer = (operation: string, metadata?: Record<string, any>) => 
  performanceMonitor.end(operation, metadata);
export const measurePerformance = <T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, any>) =>
  performanceMonitor.measure(operation, fn, metadata);
