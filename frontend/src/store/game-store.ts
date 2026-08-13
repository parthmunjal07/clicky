import { create } from 'zustand';
import { gameApi, type GameMode } from '../lib/game-api';

export type GameStatus = 'idle' | 'countdown' | 'active' | 'completed' | 'error';

interface GameState {
  sessionId: string | null;
  modeType: GameMode | null;
  modeValue: number | null;
  serverStartedAt: number | null;

  status: GameStatus;
  countdownValue: number;

  optimisticClicks: number;
  serverClicks: number;
  serverScore: number | null; // finalized score/elapsedMs
  rank: number | null;
  
  isReconnecting: boolean;
  pendingClicks: number;
  seqNum: number;
  isFlushing: boolean;
  retryDelayMs: number;
  retryAfter: number;

  actions: {
    startGame: (modeType: GameMode, modeValue: number) => Promise<string>;
    recoverSession: (sessionId: string) => Promise<void>;
    recordClick: () => void;
    flushClicks: () => Promise<void>;
    endSession: () => Promise<void>;
    decrementCountdown: () => void;
    setStatus: (status: GameStatus) => void;
    reset: () => void;
  };
}

const INITIAL_STATE = {
  sessionId: null,
  modeType: null,
  modeValue: null,
  serverStartedAt: null,
  status: 'idle' as GameStatus,
  countdownValue: 3,
  optimisticClicks: 0,
  serverClicks: 0,
  serverScore: null,
  rank: null,
  isReconnecting: false,
  pendingClicks: 0,
  seqNum: 0,
  isFlushing: false,
  retryDelayMs: 500,
  retryAfter: 0,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,
  actions: {
    startGame: async (modeType: GameMode, modeValue: number) => {
      set({ status: 'idle', isReconnecting: false });
      const res = await gameApi.startGame(modeType, modeValue);
      set({
        sessionId: res.sessionId,
        modeType,
        modeValue,
        serverStartedAt: new Date(res.serverStartedAt).getTime(),
        status: 'countdown',
        countdownValue: 3,
        optimisticClicks: 0,
        serverClicks: 0,
        serverScore: null,
        rank: null,
        pendingClicks: 0,
        seqNum: 0,
        isReconnecting: false,
        isFlushing: false,
        retryDelayMs: 500,
        retryAfter: 0,
      });
      return res.sessionId;
    },

    recoverSession: async (sessionId: string) => {
      const state = get();
      if (state.sessionId === sessionId && state.status !== 'idle') {
        return; // Already have it in memory
      }
      
      const res = await gameApi.getSession(sessionId);
      
      set({
        sessionId: res.sessionId,
        modeType: res.modeType,
        modeValue: res.modeValue,
        serverStartedAt: new Date(res.serverStartedAt).getTime(),
        status: res.status === 'completed' || res.status === 'expired' ? 'completed' : 'active',
        optimisticClicks: res.clicks,
        serverClicks: res.clicks,
        serverScore: res.score ?? null,
        rank: res.rank ?? null,
        pendingClicks: 0,
        seqNum: 0,
        isReconnecting: false,
        isFlushing: false,
        retryDelayMs: 500,
        retryAfter: 0,
      });
    },

    recordClick: () => {
      const { status } = get();
      if (status !== 'active') return;
      set((state) => ({
        optimisticClicks: state.optimisticClicks + 1,
        pendingClicks: state.pendingClicks + 1,
      }));
    },

    flushClicks: async () => {
      const { sessionId, pendingClicks, seqNum, status, isFlushing, retryAfter } = get();
      if (!sessionId || status !== 'active' || pendingClicks === 0 || isFlushing || Date.now() < retryAfter) return;

      const currentSeqNum = seqNum + 1;
      const countToFlush = pendingClicks;

      set({ seqNum: currentSeqNum, pendingClicks: 0, isFlushing: true });

      try {
        const res = await gameApi.clickBatch(sessionId, countToFlush, currentSeqNum);
        
        set(() => {
          const updates: Partial<GameState> = {
            serverClicks: res.clicks,
            isReconnecting: false,
            isFlushing: false,
            retryDelayMs: 500,
            retryAfter: 0,
          };
          if (res.finalized) {
            updates.status = 'completed';
            updates.serverScore = res.score ?? null;
          }
          return updates;
        });
      } catch (err) {
        // Network drop: put clicks back into pending buffer, mark reconnecting, increment backoff
        set((state) => {
          const nextDelay = Math.min(state.retryDelayMs * 2, 5000);
          return {
            pendingClicks: state.pendingClicks + countToFlush,
            isReconnecting: true,
            isFlushing: false,
            retryDelayMs: nextDelay,
            retryAfter: Date.now() + state.retryDelayMs,
          };
        });
        throw err;
      }
    },

    endSession: async () => {
      const { sessionId, modeType } = get();
      if (!sessionId || modeType !== 'timer') return;

      try {
        const res = await gameApi.endSession(sessionId);
        set({
          status: 'completed',
          serverClicks: res.clickCount,
          serverScore: res.score,
          rank: res.rank ?? null,
        });
      } catch (err) {
        set({ status: 'error' });
      }
    },

    decrementCountdown: () => {
      const { countdownValue } = get();
      if (countdownValue > 1) {
        set({ countdownValue: countdownValue - 1 });
      } else {
        set({ status: 'active' });
      }
    },

    setStatus: (status: GameStatus) => {
      set({ status });
    },

    reset: () => set({ ...INITIAL_STATE }),
  },
}));
