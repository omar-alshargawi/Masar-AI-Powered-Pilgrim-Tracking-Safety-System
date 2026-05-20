import { useEffect, useCallback } from "react";
import { createPilgrimWebSocket } from "../services/ws";

/**
 * Connects to /ws/pilgrim/{pilgrimId}.
 * Calls onStatusUpdate(msg) for "pilgrim_update" messages.
 * Calls onHelpSent(msg) for "help_sent" messages.
 */
export function usePilgrimWs(pilgrimId, { onStatusUpdate, onHelpSent }) {
  const handleMessage = useCallback((msg) => {
    if (msg.type === "pilgrim_update" && onStatusUpdate) onStatusUpdate(msg);
    if (msg.type === "help_sent" && onHelpSent) onHelpSent(msg);
  }, [onStatusUpdate, onHelpSent]);

  useEffect(() => {
    if (!pilgrimId) return;
    const socket = createPilgrimWebSocket(pilgrimId, handleMessage);
    return () => socket.close();
  }, [pilgrimId, handleMessage]);
}
