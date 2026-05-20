import { useState, useEffect, useRef } from "react";

/**
 * Watches the device position and returns { position, error, supported }.
 * Calls onChange(coords) on each new position when active=true.
 */
export function useGeolocation(active, onChange) {
  const [position, setPosition] = useState(null);
  const [error, setError] = useState(null);
  const watchIdRef = useRef(null);
  const supported = typeof navigator !== "undefined" && "geolocation" in navigator;

  useEffect(() => {
    if (!supported) {
      setError("Geolocation not supported");
      return;
    }

    if (active) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            speed: pos.coords.speed ?? 0,
            heading: pos.coords.heading ?? 0,
          };
          setPosition(coords);
          setError(null);
          if (onChange) onChange(coords);
        },
        (err) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [active]);  // eslint-disable-line react-hooks/exhaustive-deps

  return { position, error, supported };
}
