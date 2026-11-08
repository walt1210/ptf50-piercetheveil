import { useCallback, useEffect, useState } from "react";
import { countPendingAppointments } from "../features/appointments/appointmentService";

const REFRESH_MS = 60 * 1000;

// Number of pending booking requests, kept fresh: every minute, when the tab regains focus,
// and right after the admin approves/rejects something. Errors keep the last known number.
export function usePendingCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await countPendingAppointments());
    } catch {
      /* keep the last known count; the pages themselves show real errors */
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("appointments-changed", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("appointments-changed", refresh);
    };
  }, [refresh]);

  return count;
}
