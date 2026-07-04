import { useEffect, useState } from "react";

import { checkHealth } from "@/api/client";

export type HealthState = "checking" | "online" | "offline";

/** Polls the backend `/health` endpoint so the header can show connectivity. */
export function useHealth(intervalMs = 30_000): HealthState {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let active = true;

    const run = async () => {
      const ok = await checkHealth();
      if (active) setState(ok ? "online" : "offline");
    };

    run();
    const timer = setInterval(run, intervalMs);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return state;
}
