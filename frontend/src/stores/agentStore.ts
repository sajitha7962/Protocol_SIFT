import { create } from 'zustand';
import type { AgentActivity, AgentState, AgentStage } from '../types';
import { mockAgentState, mockAgentActivities } from '../mocks';

interface AgentStore {
  state: AgentState;
  activities: AgentActivity[];
  isSimulating: boolean;
  setStatus: (status: AgentState['status']) => void;
  setStage: (stage: AgentStage) => void;
  addActivity: (activity: AgentActivity) => void;
  setSimulating: (v: boolean) => void;
  updateProgress: (stageProgress: number, overallProgress: number) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  state: mockAgentState,
  activities: mockAgentActivities,
  isSimulating: false,
  setStatus: (status) => set((s) => ({ state: { ...s.state, status } })),
  setStage: (stage) => set((s) => ({ state: { ...s.state, currentStage: stage } })),
  addActivity: (activity) => set((s) => ({ activities: [activity, ...s.activities].slice(0, 100) })),
  setSimulating: (v) => set({ isSimulating: v }),
  updateProgress: (stageProgress, overallProgress) =>
    set((s) => ({ state: { ...s.state, stageProgress, overallProgress, lastUpdate: new Date().toISOString() } })),
}));
