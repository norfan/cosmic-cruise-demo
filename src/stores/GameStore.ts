/**
 * GameStore - 游戏状态管理
 *
 * 管理：
 *   - 能量值
 *   - 进度
 *   - 飞船状态
 *   - 事件
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TierProgress {
  collected: number;
  goal: number;
  completed: boolean;
}

export interface SpaceshipState {
  speedLevel: number;
  shieldLevel: number;
  collectionLevel: number;
}

export interface GameState {
  currentEnergy: number;
  totalEnergyCollected: number;
  currentTier: number;
  unlockedTiers: number[];
  tierProgress: Record<number, TierProgress>;
  spaceship: SpaceshipState;
  discoveredPlanets: string[];
  discoveredStars: string[];
  discoveredEvents: string[];
  settings: {
    volume: number;
    sfxVolume: number;
    musicVolume: number;
    controlMode: 'keyboard' | 'mouse' | 'touch';
    quality: 'low' | 'medium' | 'high';
  };
}

const TIER_GOALS: Record<number, number> = {
  0: 500,
  1: 1500,
  2: 4500,
  3: 13500,
  4: 40500,
  5: 121500,
  6: 364500,
  7: 1000000,
};

const createInitialTierProgress = (): Record<number, TierProgress> => {
  const progress: Record<number, TierProgress> = {};
  for (let i = 0; i <= 7; i++) {
    progress[i] = {
      collected: 0,
      goal: TIER_GOALS[i] ?? 1000000,
      completed: i === 0,
    };
  }
  return progress;
};

const initialState: GameState = {
  currentEnergy: 0,
  totalEnergyCollected: 0,
  currentTier: 0,
  unlockedTiers: [0],
  tierProgress: createInitialTierProgress(),
  spaceship: {
    speedLevel: 1,
    shieldLevel: 1,
    collectionLevel: 1,
  },
  discoveredPlanets: [],
  discoveredStars: [],
  discoveredEvents: [],
  settings: {
    volume: 0.8,
    sfxVolume: 0.7,
    musicVolume: 0.6,
    controlMode: 'keyboard',
    quality: 'medium',
  },
};

type GameAction = {
  addEnergy: (amount: number) => void;
  spendEnergy: (amount: number) => boolean;
  unlockTier: (tier: number) => void;
  setCurrentTier: (tier: number) => void;
  completeTier: (tier: number) => void;
  discoverPlanet: (planetId: string) => void;
  discoverStar: (starId: string) => void;
  discoverEvent: (eventId: string) => void;
  upgradeSpaceship: (type: 'speed' | 'shield' | 'collection') => boolean;
  setControlMode: (mode: 'keyboard' | 'mouse' | 'touch') => void;
  setVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setQuality: (quality: 'low' | 'medium' | 'high') => void;
  resetGame: () => void;
};

export const useGameStore = create<GameState & GameAction>()(
  persist(
    (set, get) => ({
      ...initialState,

      addEnergy: (amount: number) => {
        const state = get();
        const newEnergy = state.currentEnergy + amount;
        const tierProgress = { ...state.tierProgress };
        const currentTierProgress = { ...tierProgress[state.currentTier] };
        currentTierProgress.collected += amount;
        const completed =
          currentTierProgress.collected >= currentTierProgress.goal &&
          state.currentTier < 7;
        if (completed) {
          currentTierProgress.completed = true;
        }
        tierProgress[state.currentTier] = currentTierProgress;

        const nextTier = completed ? state.currentTier + 1 : state.currentTier;
        const needsUnlock = completed && !state.unlockedTiers.includes(nextTier);

        set({
          currentEnergy: newEnergy,
          totalEnergyCollected: state.totalEnergyCollected + amount,
          tierProgress,
          currentTier: nextTier,
          unlockedTiers: needsUnlock
            ? [...state.unlockedTiers, nextTier]
            : state.unlockedTiers,
        });
      },

      spendEnergy: (amount: number) => {
        const state = get();
        if (state.currentEnergy < amount) return false;
        set({ currentEnergy: state.currentEnergy - amount });
        return true;
      },

      unlockTier: (tier: number) => {
        const state = get();
        if (!state.unlockedTiers.includes(tier)) {
          set({ unlockedTiers: [...state.unlockedTiers, tier] });
        }
      },

      setCurrentTier: (tier: number) => {
        set({ currentTier: tier });
      },

      completeTier: (tier: number) => {
        const state = get();
        const tierProgress = { ...state.tierProgress };
        if (tierProgress[tier]) {
          tierProgress[tier] = { ...tierProgress[tier], completed: true };
        }
        set({ tierProgress, currentTier: tier });
      },

      discoverPlanet: (planetId: string) => {
        const state = get();
        if (!state.discoveredPlanets.includes(planetId)) {
          set({ discoveredPlanets: [...state.discoveredPlanets, planetId] });
        }
      },

      discoverStar: (starId: string) => {
        const state = get();
        if (!state.discoveredStars.includes(starId)) {
          set({ discoveredStars: [...state.discoveredStars, starId] });
        }
      },

      discoverEvent: (eventId: string) => {
        const state = get();
        if (!state.discoveredEvents.includes(eventId)) {
          set({ discoveredEvents: [...state.discoveredEvents, eventId] });
        }
      },

      upgradeSpaceship: (type: 'speed' | 'shield' | 'collection') => {
        const state = get();
        const costs = {
          speed: [200, 600, 1800, 5400],
          shield: [300, 900],
          collection: [150, 450],
        };
        const level = state.spaceship[type === 'speed' ? 'speedLevel' : type === 'shield' ? 'shieldLevel' : 'collectionLevel'];
        const costIndex = level - 1;
        if (costIndex >= costs[type].length) return false;
        const cost = costs[type][costIndex];
        if (state.currentEnergy < cost) return false;

        set({
          currentEnergy: state.currentEnergy - cost,
          spaceship: {
            ...state.spaceship,
            [type === 'speed' ? 'speedLevel' : type === 'shield' ? 'shieldLevel' : 'collectionLevel']: level + 1,
          },
        });
        return true;
      },

      setControlMode: (mode: 'keyboard' | 'mouse' | 'touch') => {
        set((state) => ({
          settings: { ...state.settings, controlMode: mode },
        }));
      },

      setVolume: (volume: number) => {
        set((state) => ({
          settings: { ...state.settings, volume },
        }));
      },

      setSfxVolume: (volume: number) => {
        set((state) => ({
          settings: { ...state.settings, sfxVolume: volume },
        }));
      },

      setMusicVolume: (volume: number) => {
        set((state) => ({
          settings: { ...state.settings, musicVolume: volume },
        }));
      },

      setQuality: (quality: 'low' | 'medium' | 'high') => {
        set((state) => ({
          settings: { ...state.settings, quality },
        }));
      },

      resetGame: () => {
        set({
          ...initialState,
          tierProgress: createInitialTierProgress(),
        });
      },
    }),
    {
      name: 'cosmic-cruise-game',
    }
  )
);

export const getUpgradeCost = (type: 'speed' | 'shield' | 'collection', level: number): number => {
  const costs = {
    speed: [200, 600, 1800, 5400],
    shield: [300, 900],
    collection: [150, 450],
  };
  return costs[type]?.[level - 1] ?? 0;
};

export const getSpaceshipStats = (spaceship: SpaceshipState) => ({
  speed: 5 + (spaceship.speedLevel - 1) * 1,
  maxVelocity: 15 + (spaceship.speedLevel - 1) * 3,
  acceleration: 10 + (spaceship.speedLevel - 1) * 2,
  shields: 100 + (spaceship.shieldLevel - 1) * 25,
  maxShields: 100 + (spaceship.shieldLevel - 1) * 25,
  collectionRadius: 2 + (spaceship.collectionLevel - 1) * 0.5,
});

export default useGameStore;