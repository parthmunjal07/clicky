import { apiRequest } from './api';

export type GameMode = 'timer' | 'clicks';

export interface StartSessionResponse {
  sessionId: string;
  serverStartedAt: string;
}

export interface ClickBatchResponse {
  finalized: boolean;
  clicks: number;
  timeRemainingMs?: number;
  clicksRemaining?: number;
  score?: number;
  elapsedMs?: number;
  clickCount?: number;
}

export interface EndSessionResponse {
  finalized: boolean;
  sessionId: string;
  modeType: GameMode;
  modeValue: number;
  score: number;
  clickCount: number;
  rank?: number;
}

export interface SessionStateResponse {
  sessionId: string;
  status: 'active' | 'completed' | 'expired';
  modeType: GameMode;
  modeValue: number;
  clicks: number;
  elapsedMs?: number;
  timeRemainingMs?: number;
  clicksRemaining?: number;
  score?: number;
  serverStartedAt: string;
  serverEndedAt?: string | null;
  rank?: number;
}

export const gameApi = {
  startGame: (modeType: GameMode, modeValue: number) =>
    apiRequest<StartSessionResponse>('/game/start', {
      method: 'POST',
      body: { mode_type: modeType, mode_value: modeValue },
    }),

  clickBatch: (sessionId: string, count: number, seqNum: number) =>
    apiRequest<ClickBatchResponse>('/game/click-batch', {
      method: 'POST',
      body: { count, seq_num: seqNum },
      headers: { 'x-session-id': sessionId },
    }),

  endSession: (sessionId: string) =>
    apiRequest<EndSessionResponse>('/game/end', {
      method: 'POST',
      headers: { 'x-session-id': sessionId },
    }),

  abandonSession: () =>
    apiRequest<{ success: boolean }>('/game/abandon', {
      method: 'POST',
    }),

  getSession: (sessionId: string) =>
    apiRequest<SessionStateResponse>(`/game/session/${sessionId}`, {
      method: 'GET',
    }),
};
