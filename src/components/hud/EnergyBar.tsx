/**
 * EnergyBar - Energy progress bar component
 */

import { useGameStore } from '@/stores/GameStore';
import './EnergyBar.css';

export function EnergyBar() {
  const currentEnergy = useGameStore((state) => state.currentEnergy);
  const currentTier = useGameStore((state) => state.currentTier);
  const tierProgress = useGameStore((state) => state.tierProgress[currentTier]);

  const goal = tierProgress?.goal ?? 500;
  const progress = Math.min((currentEnergy / goal) * 100, 100);
  const isComplete = tierProgress?.completed ?? false;

  return (
    <div className="energy-bar">
      <div className="energy-bar-label">
        <span className="energy-icon">⚡</span>
        <span className="energy-value">{currentEnergy}</span>
        <span className="energy-separator">/</span>
        <span className="energy-goal">{goal}</span>
      </div>
      <div className="energy-bar-track">
        <div
          className={`energy-bar-fill ${isComplete ? 'complete' : ''}`}
          style={{ width: `${progress}%` }}
        />
        {isComplete && (
          <div className="energy-bar-complete-marker">
            <span>✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnergyBar;