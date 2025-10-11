import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeGeneratorProps {
  value: string;
  displayValue?: boolean;
  height?: number;
  width?: number;
}

export const BarcodeGenerator = ({ 
  value, 
  displayValue = true,
  height = 50,
  width = 2
}: BarcodeGeneratorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          displayValue: displayValue,
          height: height,
          width: width,
          fontSize: 14,
          margin: 10,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [value, displayValue, height, width]);

  return <canvas ref={canvasRef} className="max-w-full" />;
};
