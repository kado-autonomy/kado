import { describe, it, expect, beforeEach } from 'vitest';
import { OrchestratorStateMachine } from '../state-machine.js';

describe('OrchestratorStateMachine', () => {
  let sm: OrchestratorStateMachine;

  beforeEach(() => {
    sm = new OrchestratorStateMachine();
  });

  describe('valid transitions', () => {
    it('transitions idle -> planning', () => {
      const result = sm.transition('idle', 'planning');
      expect(result).toBe('planning');
      expect(sm.getState()).toBe('planning');
    });

    it('transitions planning -> executing', () => {
      sm.transition('idle', 'planning');
      const result = sm.transition('planning', 'executing');
      expect(result).toBe('executing');
      expect(sm.getState()).toBe('executing');
    });

    it('transitions planning -> error', () => {
      sm.transition('idle', 'planning');
      const result = sm.transition('planning', 'error');
      expect(result).toBe('error');
      expect(sm.getState()).toBe('error');
    });

    it('transitions executing -> verifying', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      const result = sm.transition('executing', 'verifying');
      expect(result).toBe('verifying');
      expect(sm.getState()).toBe('verifying');
    });

    it('transitions executing -> error', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      const result = sm.transition('executing', 'error');
      expect(result).toBe('error');
      expect(sm.getState()).toBe('error');
    });

    it('transitions verifying -> complete', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      const result = sm.transition('verifying', 'complete');
      expect(result).toBe('complete');
      expect(sm.getState()).toBe('complete');
    });

    it('transitions verifying -> executing', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      const result = sm.transition('verifying', 'executing');
      expect(result).toBe('executing');
      expect(sm.getState()).toBe('executing');
    });

    it('transitions verifying -> error', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      const result = sm.transition('verifying', 'error');
      expect(result).toBe('error');
      expect(sm.getState()).toBe('error');
    });

    it('transitions complete -> idle', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      sm.transition('verifying', 'complete');
      const result = sm.transition('complete', 'idle');
      expect(result).toBe('idle');
      expect(sm.getState()).toBe('idle');
    });

    it('transitions error -> idle', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'error');
      const result = sm.transition('error', 'idle');
      expect(result).toBe('idle');
      expect(sm.getState()).toBe('idle');
    });

    it('transitions idle -> error', () => {
      const result = sm.transition('idle', 'error');
      expect(result).toBe('error');
      expect(sm.getState()).toBe('error');
    });

    it('transitions complete -> error', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      sm.transition('verifying', 'complete');
      const result = sm.transition('complete', 'error');
      expect(result).toBe('error');
      expect(sm.getState()).toBe('error');
    });
  });

  describe('invalid transitions', () => {
    it('throws on idle -> executing', () => {
      expect(() => sm.transition('idle', 'executing')).toThrow(
        /Invalid transition: idle -> executing/
      );
    });

    it('throws on idle -> complete', () => {
      expect(() => sm.transition('idle', 'complete')).toThrow(
        /Invalid transition: idle -> complete/
      );
    });

    it('throws on planning -> idle', () => {
      expect(() => sm.transition('planning', 'idle')).toThrow(
        /Invalid transition: planning -> idle/
      );
    });

    it('throws on complete -> planning', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.transition('executing', 'verifying');
      sm.transition('verifying', 'complete');
      expect(() => sm.transition('complete', 'planning')).toThrow(
        /Invalid transition: complete -> planning/
      );
    });
  });

  describe('error state transitions', () => {
    it('can only transition from error to idle', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'error');
      expect(() => sm.transition('error', 'planning')).toThrow(
        /Invalid transition: error -> planning/
      );
      expect(() => sm.transition('error', 'executing')).toThrow(
        /Invalid transition: error -> executing/
      );
    });
  });

  describe('reset', () => {
    it('resets to idle from any state', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'executing');
      sm.reset();
      expect(sm.getState()).toBe('idle');
    });

    it('allows planning after reset from error', () => {
      sm.transition('idle', 'planning');
      sm.transition('planning', 'error');
      sm.reset();
      const result = sm.transition('idle', 'planning');
      expect(result).toBe('planning');
    });
  });

  describe('canTransition', () => {
    it('returns true for allowed transitions', () => {
      expect(sm.canTransition('planning')).toBe(true);
      expect(sm.canTransition('executing')).toBe(false);
    });

    it('returns false for disallowed transitions', () => {
      expect(sm.canTransition('complete')).toBe(false);
      expect(sm.canTransition('executing')).toBe(false);
    });

    it('updates after transition', () => {
      sm.transition('idle', 'planning');
      expect(sm.canTransition('executing')).toBe(true);
      expect(sm.canTransition('planning')).toBe(false);
    });
  });
});
