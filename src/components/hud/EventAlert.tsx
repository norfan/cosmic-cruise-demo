/**
 * EventAlert - Game event notification component
 */

import { useEffect, useState } from 'react';
import './EventAlert.css';

interface ActiveEvent {
  type: string;
  name: string;
  description?: string;
}

export function EventAlert() {
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleEvent = (e: CustomEvent) => {
      setActiveEvent({
        type: e.detail.type,
        name: e.detail.name || e.detail.type,
      });
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener('gameEventTriggered', handleEvent as EventListener);
    return () => window.removeEventListener('gameEventTriggered', handleEvent as EventListener);
  }, []);

  if (!visible || !activeEvent) return null;

  const getEventIcon = (type: string): string => {
    const icons: Record<string, string> = {
      energyCloud: '⚡',
      asteroidField: '☄️',
      spaceStation: '🛸',
      gravitationalAnomaly: '🌀',
      energyStorm: '🌪️',
      alienSignal: '👽',
      creationFragment: '✨',
    };
    return icons[type] || '❓';
  };

  return (
    <div className={`event-alert ${visible ? 'visible' : ''}`}>
      <span className="event-icon">{getEventIcon(activeEvent.type)}</span>
      <span className="event-name">{activeEvent.name}</span>
    </div>
  );
}

export default EventAlert;