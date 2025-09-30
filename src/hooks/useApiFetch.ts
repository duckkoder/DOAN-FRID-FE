import { useEffect, useRef, useState } from "react";

type State<T> = { data?: T; loading: boolean; error?: unknown };

export function useApiFetch<T = unknown>(
  fetcher: (signal: AbortSignal) => Promise<T | { data?: T }>,
) {
  const [state, setState] = useState<State<T>>({ loading: true });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    let mounted = true;
    setState({ loading: true });

    (async () => {
      try {
        const res = await fetcher(signal);
        if (!mounted) return;

        // support both axios-style response ({ data }) and raw data
        let data: T | undefined;
        if (res && typeof res === "object" && "data" in (res as object)) {
          data = (res as { data?: T }).data;
        } else {
          data = res as T;
        }

        setState({ data, loading: false });
      } catch (err) {
        if (signal.aborted) return;
        setState({ error: err as unknown, loading: false });
      }
    })();

    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
