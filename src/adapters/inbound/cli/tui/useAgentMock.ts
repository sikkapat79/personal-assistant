import { useState, useEffect } from 'react';
import { composeMock } from '../../../../composition-mock';

/**
 * Mock version of useAgent hook - uses fixture data instead of Notion API
 */
export function useAgentMock() {
  const [state, setState] = useState<{
    composition: Awaited<ReturnType<typeof composeMock>> | null;
    error: string | null;
  }>({ composition: null, error: null });

  useEffect(() => {
    let cancelled = false;
    composeMock()
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
