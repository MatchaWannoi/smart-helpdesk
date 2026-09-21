"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface OperationCopy {
  title: string;
  description: string;
}

export function useRenderedOperation() {
  const router = useRouter();
  const [operation, setOperation] = useState<OperationCopy | null>(null);
  const [isRefreshing, startTransition] = useTransition();
  const refreshRequestedRef = useRef(false);

  const begin = useCallback((copy: OperationCopy) => {
    refreshRequestedRef.current = false;
    setOperation(copy);
  }, []);

  const cancel = useCallback(() => {
    refreshRequestedRef.current = false;
    setOperation(null);
  }, []);

  const finishWithRefresh = useCallback(() => {
    refreshRequestedRef.current = true;
    startTransition(() => {
      router.refresh();
    });
  }, [router]);

  useEffect(() => {
    if (!refreshRequestedRef.current || isRefreshing) return;

    const frame = requestAnimationFrame(() => {
      refreshRequestedRef.current = false;
      setOperation(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [isRefreshing]);

  return {
    operation,
    isWorking: operation !== null,
    begin,
    cancel,
    finishWithRefresh,
  };
}
