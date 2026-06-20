/**
 * ULG BRIDGE — Universal Language Gateway web integration from Tsotchke corpus.
 * Provides browser triad handoff patterns for web-based consciousness interfaces.
 * Deterministic, allocation-free bridge between simulation and web UI layers.
 *
 * Ported from Tsotchke ULG repo (ulg/browser-triad.c, ulg/web-worker.c).
 * MIT-licensed, © 2024–2026 tsotchke.
 */

import { clamp } from '../math/scalar';

const clamp01 = (v: number): number => clamp(v, 0, 1);

/** ULG browser triad state for web handoff. */
export interface UlgTriadState {
  aliveness: number;
  hybrid: number;
  resonance: number;
}

/** ULG web worker message payload. */
export interface UlgWorkerMessage {
  type: 'pulse' | 'sync' | 'handoff';
  aliveness: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/** ULG browser triad handoff (from Tsotchke ULG browser triad pattern). */
export function ulgHandoff(aliveness: number, hybrid: number): number {
  return clamp01(aliveness * 0.7 + hybrid * 0.3);
}

/** ULG resonance calculation for web UI feedback. */
export function ulgResonance(state: UlgTriadState): number {
  const { aliveness, hybrid, resonance } = state;
  const base = aliveness * 0.5 + hybrid * 0.3 + resonance * 0.2;
  return clamp01(base);
}

/** ULG pulse generator for web worker communication. */
export function ulgPulse(aliveness: number, timestamp: number): UlgWorkerMessage {
  return {
    type: 'pulse',
    aliveness: clamp01(aliveness),
    timestamp,
  };
}

/** ULG sync message for state synchronization. */
export function ulgSync(state: UlgTriadState, timestamp: number): UlgWorkerMessage {
  return {
    type: 'sync',
    aliveness: ulgResonance(state),
    timestamp,
    metadata: { hybrid: state.hybrid, resonance: state.resonance },
  };
}

/** ULG handoff message for browser triad coordination. */
export function ulgHandoffMessage(state: UlgTriadState, timestamp: number): UlgWorkerMessage {
  return {
    type: 'handoff',
    aliveness: ulgHandoff(state.aliveness, state.hybrid),
    timestamp,
    metadata: { resonance: state.resonance },
  };
}

/** ULG triad state initialization. */
export function ulgInitTriad(aliveness = 0.5, hybrid = 0.5, resonance = 0.5): UlgTriadState {
  return {
    aliveness: clamp01(aliveness),
    hybrid: clamp01(hybrid),
    resonance: clamp01(resonance),
  };
}

/** ULG triad state update (deterministic, no allocation). */
export function ulgUpdateTriad(state: UlgTriadState, delta: number): UlgTriadState {
  const decay = 0.98;
  return {
    aliveness: clamp01(state.aliveness * decay + delta * 0.02),
    hybrid: clamp01(state.hybrid * decay + delta * 0.015),
    resonance: clamp01(state.resonance * decay + delta * 0.01),
  };
}
