// Central colour palette ported from GraphColors.swift

// Brand colors
export const EMBER = '#f1502f';
export const EMBER_FAINT = 'rgba(241, 80, 47, 0.1)';
export const EMBER_DEEP = '#441151';

// Accent for unrevealed nodes during a recall round
export const PENDING = '#8BC34A';

// Entity-label swatches
export function labelColor(label: string): string {
  switch (label) {
    case 'person':       return '#ffd166';
    case 'location':     return '#06d6a0';
    case 'food':         return '#ef476f';
    case 'organization': return '#118ab2';
    default:             return EMBER;
  }
}
