import { useEffect, useCallback } from "react";
import { createSupervisorWebSocket } from "../services/ws";

/**
 * Connects to /ws/supervisor/{supervisorId}.
 * Calls onPilgrimUpdate(msg) for "pilgrim_update" messages.
 * Calls onHelpRequest(msg) for "help_request" messages.
 */
export function useSupervisorWs(supervisorId, { onPilgrimUpdate, onHelpRequest }) {
  const handleMessage = useCallback((msg) => {
    if (msg.type === "pilgrim_update" && onPilgrimUpdate) onPilgrimUpdate(msg);
    if (msg.type === "help_request" && onHelpRequest) onHelpRequest(msg);
  }, [onPilgrimUpdate, onHelpRequest]);

  useEffect(() => {
    if (!supervisorId) return;
    const socket = createSupervisorWebSocket(supervisorId, handleMessage);
    return () => socket.close();
  }, [supervisorId, handleMessage]);
}
