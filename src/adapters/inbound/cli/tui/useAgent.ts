import { useState, useEffect } from 'react';
import { compose } from '../../../../composition';

export function useAgent() {
  const [state, setState] = useState<{
    composition: Awaited<ReturnType<typeof compose>> | null;
    error: string | null;
  }>({ composition: null, error: null });

  useEffect(() => {
    let cancelled = false;
    compose()
      .then((composition) => {
        if (!cancelled) setState({ composition, error: null });
      })
      .catch((e) => {
        if (!cancelled) setState({ composition: null, error: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
