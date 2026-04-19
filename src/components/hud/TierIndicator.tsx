/**
 * TierIndicator - Current tier display
 */

import { useGameStore } from '@/stores/GameStore';
import './TierIndicator.css';

const TIER_INFO = [
  { id: 0, name: '洪荒', icon: '🌑', color: '#444455', subtitle: 'Origin' },
  { id: 1, name: '文明曙光', icon: '🌅', color: '#5588aa', subtitle: 'Dawn' },
  { id: 2, name: '金属时代', icon: '⚙️', color: '#889966', subtitle: 'Metal' },
  { id: 3, name: '电力革命', icon: '⚡', color: '#aaaa44', subtitle: 'Electric' },
  { id: 4, name: '核能纪元', icon: '☢️', color: '#ff8844', subtitle: 'Nuclear' },
  { id: 5, name: '量子世代', icon: '⚛️', color: '#aa44ff', subtitle: 'Quantum' },
  { id: 6, name: '维度跨越', icon: '🌀', color: '#44aaff', subtitle: 'Dimensional' },
  { id: 7, name: '创造者', icon: '✨', color: '#ffd700', subtitle: 'Creator' },
];

export function TierIndicator() {
  const currentTier = useGameStore((state) => state.currentTier);
  const unlockedTiers = useGameStore((state) => state.unlockedTiers);

  const tier = TIER_INFO[currentTier] ?? TIER_INFO[0];
  const nextTier = TIER_INFO[currentTier + 1];

  return (
    <div className="tier-indicator">
      <div className="tier-current" style={{ borderColor: tier.color }}>
        <span className="tier-icon">{tier.icon}</span>
        <span className="tier-name" style={{ color: tier.color }}>{tier.name}</span>
      </div>
      {nextTier && !unlockedTiers.includes(currentTier + 1) && (
        <div className="tier-next">
          <span className="tier-next-label">Next:</span>
          <span className="tier-next-name">{nextTier.icon} {nextTier.name}</span>
        </div>
      )}
    </div>
  );
}

export default TierIndicator;