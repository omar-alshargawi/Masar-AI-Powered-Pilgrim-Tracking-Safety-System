import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const MECCA = [21.4225, 39.8262];
const COLORS = { 0: "#22c55e", 1: "#f97316", 2: "#ef4444" };

function FlyTo({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 17, { duration: 1 });
  }, [position, map]);
  return null;
}

export default function SupervisorMap({ pilgrims, supervisorLat, supervisorLon, selected }) {
  return (
    <MapContainer
      center={MECCA}
      zoom={15}
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Supervisor marker */}
      {supervisorLat && supervisorLon && (
        <CircleMarker
          center={[supervisorLat, supervisorLon]}
          radius={10}
          pathOptions={{ fillColor: "#3b82f6", color: "#1d4ed8", fillOpacity: 1, weight: 2 }}
        >
          <Popup>Supervisor</Popup>
        </CircleMarker>
      )}

      {/* Pilgrim markers */}
      {pilgrims.map((p) => (
        p.pilgrim_lat && p.pilgrim_lon ? (
          <CircleMarker
            key={p.user_id}
            center={[p.pilgrim_lat, p.pilgrim_lon]}
            radius={8}
            pathOptions={{
              fillColor: COLORS[p.label] ?? "#64748b",
              color: "#fff",
              fillOpacity: 0.9,
              weight: 1.5,
            }}
          >
            <Popup>
              <strong>{p.display_name}</strong><br />
              {p.label_name ?? "No data"}<br />
              Confidence: {p.confidence != null ? (p.confidence * 100).toFixed(0) + "%" : "—"}
            </Popup>
          </CircleMarker>
        ) : null
      ))}

      {selected && <FlyTo position={[selected.pilgrim_lat, selected.pilgrim_lon]} />}
    </MapContainer>
  );
}
