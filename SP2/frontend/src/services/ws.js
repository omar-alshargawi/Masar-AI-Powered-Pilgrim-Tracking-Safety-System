function makeWebSocket(url, onMessage) {
  let ws;
  let retryDelay = 1000;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log(`[WS] Connected: ${url}`);
      retryDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error("[WS] Parse error", e);
      }
    };

    ws.onclose = () => {
      console.log(`[WS] Disconnected (${url}) — retrying in ${retryDelay}ms`);
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    };

    ws.onerror = (err) => console.error("[WS] Error", err);
  }

  connect();
  return { close: () => ws?.close() };
}

// Use wss:// when page is served over https (e.g. via ngrok), ws:// otherwise
const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

/** Admin / global dashboard WebSocket (/ws) */
export function createWebSocket(onMessage) {
  const url = import.meta.env.VITE_WS_URL || `${wsProtocol}://${window.location.host}/ws`;
  return makeWebSocket(url, onMessage);
}

/** Supervisor WebSocket (/ws/supervisor/{id}) */
export function createSupervisorWebSocket(supervisorId, onMessage) {
  const url = `${wsProtocol}://${window.location.host}/ws/supervisor/${supervisorId}`;
  return makeWebSocket(url, onMessage);
}

/** Pilgrim WebSocket (/ws/pilgrim/{id}) */
export function createPilgrimWebSocket(pilgrimId, onMessage) {
  const url = `${wsProtocol}://${window.location.host}/ws/pilgrim/${pilgrimId}`;
  return makeWebSocket(url, onMessage);
}
