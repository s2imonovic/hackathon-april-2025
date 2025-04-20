import React from 'react'
import ConfettiLib from 'react-confetti'

interface ConfettiProps {
  width: number
  height: number
  recycle?: boolean
  numberOfPieces?: number
  gravity?: number
  colors?: string[]
  style?: React.CSSProperties
}

export const Confetti: React.FC<ConfettiProps> = ({
  width,
  height,
  recycle = false,
  numberOfPieces = 500,
  gravity = 0.2,
  colors = ['#10B981', '#C0C0C0', '#3B82F6', '#F59E0B'],
  style = {},
}) => {
  return (
    <ConfettiLib
      width={width}
      height={height}
      recycle={recycle}
      numberOfPieces={numberOfPieces}
      gravity={gravity}
      colors={colors}
      style={style}
    />
  )
} 