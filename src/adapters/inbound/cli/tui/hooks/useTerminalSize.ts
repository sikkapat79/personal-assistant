import { useEffect } from 'react';
import { useTuiStore } from '../store/tuiStore';

export function useTerminalSize(): void {
  useEffect(() => {
    const onResize = () => {
      useTuiStore.getState().setTerminalSize({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);
}
