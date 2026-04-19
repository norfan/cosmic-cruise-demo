/**
 * ShieldBar - Shield status component
 */

import { useGameStore } from '@/stores/GameStore';
import './ShieldBar.css';

export function ShieldBar() {
  const spaceship = useGameStore((state) => state.spaceship);
  
  const maxShields = 100 + (spaceship.shieldLevel - 1) * 25;
  const shields = maxShields;
  const progress = Math.min((shields / maxShields) * 100, 100);
  const isLow = shields < maxShields * 0.3;

  return (
    <div className="shield-bar">
      <div className="shield-bar-label">
        <span className="shield-icon">🛡</span>
        <span className="shield-value">{shields}</span>
        <span className="shield-separator">/</span>
        <span className="shield-max">{maxShields}</span>
      </div>
      <div className="shield-bar-track">
        <div
          className={`shield-bar-fill ${isLow ? 'low' : ''}`}
          style={{ width: `${progress}%` }}
        />
        {isLow && (
          <div className="shield-bar-warning">
            <span>!</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShieldBar;