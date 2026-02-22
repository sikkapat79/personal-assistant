import { useState } from 'react';
import { compose } from '../../../../composition';

export function useAgent() {
  const [state] = useState<{ composition: ReturnType<typeof compose> | null; error: string | null }>(() => {
    try {
      return { composition: compose(), error: null };
    } catch (e) {
      return { composition: null, error: e instanceof Error ? e.message : String(e) };
    }
  });
  if (state.error)
    return { agent: null, logs: null, todos: null, logUseCase: null, error: state.error };
  if (state.composition)
    return {
      agent: state.composition.agentUseCase,
      logs: state.composition.logs,
      todos: state.composition.todosUseCase,
      logUseCase: state.composition.logUseCase,
      error: null,
    };
  return { agent: null, logs: null, todos: null, logUseCase: null, error: null };
}
