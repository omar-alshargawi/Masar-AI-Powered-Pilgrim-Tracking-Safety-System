import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const MECCA = [21.4225, 39.8262];

function CenterOnPilgrim({ lat, lon }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lon != null) map.setView([lat, lon], 17);
  }, [lat, lon, map]);
  return null;
}

export default function MiniMap({ lat, lon }) {
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", height: "280px" }}>
      <MapContainer
        center={lat && lon ? [lat, lon] : MECCA}
        zoom={15}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {lat != null && lon != null && (
          <>
            <CircleMarker
              center={[lat, lon]}
              radius={10}
              pathOptions={{ fillColor: "#3b82f6", color: "#1d4ed8", fillOpacity: 1, weight: 2 }}
            />
            <CenterOnPilgrim lat={lat} lon={lon} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
