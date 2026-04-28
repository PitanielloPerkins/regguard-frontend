import { useEffect, useId, useRef, useState } from "react";

const CALLBACK_PREFIX = "__rgGoogleMapsCb_";

/** After a Places selection: Google's formatted line + ZIP for optional server cross-check. */
export type AddressSelection = {
  formattedAddress: string;
  zip: string;
};

type Props = {
  disabled?: boolean;
  onSelection: (sel: AddressSelection | null) => void;
};

function mapsKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
}

function extractZip5(components: google.maps.GeocoderAddressComponent[]): string | null {
  const z = components.find((c) => c.types.includes("postal_code"));
  const digits = (z?.long_name || "").replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : null;
}

export function mapsAutocompleteEnabled(): boolean {
  return mapsKey().length > 0;
}

export function AddressAutocomplete({ disabled, onSelection }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onSelRef = useRef(onSelection);
  onSelRef.current = onSelection;
  const reactId = useId();
  const inputId = `rg-addr-${reactId.replace(/:/g, "")}`;
  const key = mapsKey();
  const [mapsReady, setMapsReady] = useState(() =>
    Boolean(key && window.google?.maps?.places),
  );

  useEffect(() => {
    if (!key) {
      setMapsReady(false);
      return;
    }
    if (window.google?.maps?.places) {
      setMapsReady(true);
      return;
    }
    setMapsReady(false);
    const cb = `${CALLBACK_PREFIX}${Math.random().toString(36).slice(2)}`;
    (window as unknown as Record<string, () => void>)[cb] = () => {
      setMapsReady(true);
      delete (window as unknown as Record<string, unknown>)[cb];
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${cb}`;
    script.async = true;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
    };
    document.head.appendChild(script);
  }, [key]);

  useEffect(() => {
    if (!key || !mapsReady) {
      return;
    }
    const el = inputRef.current;
    if (!el || !window.google?.maps?.places) {
      return;
    }

    const ac = new google.maps.places.Autocomplete(el, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: ["address_components", "formatted_address"],
    });

    const lastCommitted = { current: null as string | null };

    const sub = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const comp = place.address_components;
      const formatted = (place.formatted_address || "").trim();
      if (!comp || !formatted) {
        lastCommitted.current = null;
        onSelRef.current(null);
        return;
      }
      const zip = extractZip5(comp);
      if (!zip) {
        lastCommitted.current = null;
        onSelRef.current(null);
        return;
      }
      lastCommitted.current = formatted;
      onSelRef.current({ formattedAddress: formatted, zip });
    });

    const onInput = () => {
      if (
        lastCommitted.current !== null &&
        el.value.trim() === lastCommitted.current.trim()
      ) {
        return;
      }
      lastCommitted.current = null;
      onSelRef.current(null);
    };

    el.addEventListener("input", onInput);

    return () => {
      el.removeEventListener("input", onInput);
      google.maps.event.removeListener(sub);
      google.maps.event.clearInstanceListeners(ac);
    };
  }, [key, mapsReady]);

  if (!key) {
    return null;
  }

  return (
    <input
      ref={inputRef}
      id={inputId}
      className="rg-input"
      type="text"
      disabled={disabled || !mapsReady}
      placeholder={mapsReady ? "Start typing street address…" : "Loading address search…"}
      autoComplete="off"
    />
  );
}
