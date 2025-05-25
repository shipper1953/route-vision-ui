
export interface QboidDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
  orderId?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface QboidConfigGuide {
  instructions: string[];
}
