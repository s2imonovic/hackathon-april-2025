import { FC } from 'react';

interface TradingFormProps {
  depositAmount: string;
  setDepositAmount: (value: string) => void;
  targetPriceLow: string;
  setTargetPriceLow: (value: string) => void;
  targetPriceHigh: string;
  setTargetPriceHigh: (value: string) => void;
  slippage: string;
  setSlippage: (value: string) => void;
  selectedLowAdjustment: string;
  setSelectedLowAdjustment: (value: string) => void;
  selectedHighAdjustment: string;
  setSelectedHighAdjustment: (value: string) => void;
  handleDepositAndOrder: () => void;
  isProcessing: boolean;
}

export const TradingForm: FC<TradingFormProps>; 