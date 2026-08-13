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
  
  pendingClicks: number;
  seqNum: number;
  isFlushing: boolean;

  actions: {
    startGame: (modeType: GameMode, modeValue: number) => Promise<string>;
    recoverSession: (sessionId: string) => Promise<void>;
    addPendingClicks: (count: number) => void;
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
  pendingClicks: 0,
  seqNum: 0,
  isFlushing: false,
};

export const useGameStore = create<GameState>((set, get) => ({
  ...INITIAL_STATE,
  actions: {
    startGame: async (modeType: GameMode, modeValue: number) => {
      set({ status: 'idle' });
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
        isFlushing: false,
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
        isFlushing: false,
      });
    },

    addPendingClicks: (count: number) => {
      const { status } = get();
      if (status !== 'active') return;
      set((state) => ({
        optimisticClicks: state.optimisticClicks + count,
        pendingClicks: state.pendingClicks + count,
      }));
    },

    flushClicks: async () => {
      const { sessionId, pendingClicks, seqNum, status, isFlushing } = get();
      if (!sessionId || status !== 'active' || pendingClicks === 0 || isFlushing) return;

      const currentSeqNum = seqNum + 1;
      const countToFlush = pendingClicks;

      set({ seqNum: currentSeqNum, pendingClicks: 0, isFlushing: true });

      try {
        const res = await gameApi.clickBatch(sessionId, countToFlush, currentSeqNum);
        
        set(() => {
          const updates: Partial<GameState> = {
            serverClicks: res.clicks,
            isFlushing: false,
          };
          if (res.finalized) {
            updates.status = 'completed';
            updates.serverScore = res.score ?? null;
          }
          return updates;
        });
      } catch (err) {
        // Unbroken connection enforcement: Fail the session immediately on network drop
        set({ status: 'error', isFlushing: false });
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
