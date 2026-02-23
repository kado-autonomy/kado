export type OrchestratorState =
  | 'idle'
  | 'planning'
  | 'executing'
  | 'verifying'
  | 'complete'
  | 'error';

const VALID_TRANSITIONS: Record<OrchestratorState, OrchestratorState[]> = {
  idle: ['planning', 'error'],
  planning: ['executing', 'error'],
  executing: ['verifying', 'error'],
  verifying: ['complete', 'executing', 'planning', 'error'],
  complete: ['idle', 'error'],
  error: ['idle'],
};

export class OrchestratorStateMachine {
  private currentState: OrchestratorState = 'idle';

  getState(): OrchestratorState {
    return this.currentState;
  }

  transition(from: OrchestratorState, to: OrchestratorState): OrchestratorState {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed?.includes(to)) {
      throw new Error(
        `Invalid transition: ${from} -> ${to}. Allowed: ${allowed?.join(', ') ?? 'none'}`
      );
    }
    this.currentState = to;
    return to;
  }

  canTransition(to: OrchestratorState): boolean {
    return VALID_TRANSITIONS[this.currentState]?.includes(to) ?? false;
  }

  reset(): void {
    this.currentState = 'idle';
  }
}
