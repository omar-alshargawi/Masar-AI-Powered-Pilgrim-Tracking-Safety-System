import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";

const MECCA = [21.4225, 39.8262];

const MARKER_COLOR = {
  0: "#22c55e",   // Safe — green
  1: "#f97316",   // Warning — orange
  2: "#ef4444",   // Critical — red
};

function FlyTo({ selected, pilgrims }) {
  const map = useMap();
  if (selected) {
    const p = pilgrims.find((x) => x.pilgrim_id === selected);
    if (p) map.flyTo([p.pilgrim_lat, p.pilgrim_lon], 17, { duration: 0.8 });
  }
  return null;
}

export default function Map({ pilgrims, selected }) {
  return (
    <MapContainer
      center={MECCA}
      zoom={16}
      style={{ height: "100%", width: "100%", background: "#1e293b" }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FlyTo selected={selected} pilgrims={pilgrims} />
      {pilgrims.map((p) => (
        <CircleMarker
          key={p.pilgrim_id}
          center={[p.pilgrim_lat, p.pilgrim_lon]}
          radius={selected === p.pilgrim_id ? 10 : 7}
          pathOptions={{
            color: MARKER_COLOR[p.label] ?? "#94a3b8",
            fillColor: MARKER_COLOR[p.label] ?? "#94a3b8",
            fillOpacity: 0.9,
            weight: selected === p.pilgrim_id ? 3 : 1,
          }}
        >
          <Popup>
            <strong>{p.pilgrim_id}</strong><br />
            Status: {p.label_name ?? "Unknown"}<br />
            Confidence: {p.confidence != null ? `${(p.confidence * 100).toFixed(1)}%` : "—"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
