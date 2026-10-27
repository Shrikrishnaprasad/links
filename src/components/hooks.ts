import { useCallback, useEffect, useState } from 'react';
import type { AppData, SyncState } from '../types/links';
import { getSyncState, loadData, onSyncState, subscribe } from '../services/storage';

export function useAppData(): AppData | null {
  const [data, setData] = useState<AppData | null>(null);
  useEffect(() => {
    let alive = true;
    loadData().then((d) => alive && setData(d));
    const un = subscribe((d) => alive && setData(d));
    return () => {
      alive = false;
      un();
    };
  }, []);
  return data;
}

export function useSyncState(): SyncState {
  const [s, setS] = useState(getSyncState());
  useEffect(() => {
    const un = onSyncState(setS);
    return () => {
      un();
    };
  }, []);
  return s;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Snackbar state. Pass an action (e.g. Undo) to keep the message up a little longer. */
export function useToast() {
  const [state, setState] = useState<{ msg: string; action?: ToastAction } | null>(null);
  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setState(null), state.action ? 7000 : 2500);
    return () => clearTimeout(t);
  }, [state]);
  const show = useCallback((msg: string, action?: ToastAction) => setState({ msg, action }), []);
  const dismiss = useCallback(() => setState(null), []);
  return { msg: state?.msg ?? null, action: state?.action, show, dismiss };
}
