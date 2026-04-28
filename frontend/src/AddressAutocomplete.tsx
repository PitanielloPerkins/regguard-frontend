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

function extractZip5FromPlaceComponents(
  components: google.maps.places.AddressComponent[],
): string | null {
  const z = components.find((c) => c.types.includes("postal_code"));
  const digits = (z?.longText ?? "").replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : null;
}

export function mapsAutocompleteEnabled(): boolean {
  return mapsKey().length > 0;
}

export function AddressAutocomplete({ disabled, onSelection }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const onSelRef = useRef(onSelection);
  onSelRef.current = onSelection;
  const reactId = useId();
  const hostId = `rg-addr-host-${reactId.replace(/:/g, "")}`;
  const key = mapsKey();
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!key) {
      setMapsReady(false);
      return;
    }
    if (window.google?.maps) {
      void google.maps.importLibrary("places").then(
        () => setMapsReady(true),
        () => setMapsReady(false),
      );
      return;
    }
    setMapsReady(false);
    const cb = `${CALLBACK_PREFIX}${Math.random().toString(36).slice(2)}`;
    const scriptSrcPrefix = "https://maps.googleapis.com/maps/api/js";
    const existing = document.querySelector(`script[src^="${scriptSrcPrefix}"]`);
    if (existing) {
      const bootstrapPlaces = () => {
        if (!window.google?.maps) {
          return false;
        }
        void google.maps.importLibrary("places").then(
          () => setMapsReady(true),
          () => setMapsReady(false),
        );
        return true;
      };
      if (!bootstrapPlaces()) {
        existing.addEventListener("load", () => bootstrapPlaces(), { once: true });
      }
      return () => {};
    }
    (window as unknown as Record<string, () => void>)[cb] = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      void google.maps.importLibrary("places").then(
        () => setMapsReady(true),
        () => setMapsReady(false),
      );
    };
    const script = document.createElement("script");
    script.src = `${scriptSrcPrefix}?key=${encodeURIComponent(key)}&libraries=places&v=weekly&callback=${cb}`;
    script.async = true;
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      setMapsReady(false);
    };
    document.head.appendChild(script);
  }, [key]);

  useEffect(() => {
    if (!key || !mapsReady || !hostRef.current) {
      return;
    }
    const host = hostRef.current;
    let cancelled = false;
    let teardown: (() => void) | undefined;

    void (async () => {
      await google.maps.importLibrary("places");
      if (cancelled || !hostRef.current) {
        return;
      }
      const PlaceAutocompleteElement = google.maps.places.PlaceAutocompleteElement;
      const el = new PlaceAutocompleteElement({
        includedRegionCodes: ["us"],
        requestedRegion: "us",
      });
      el.placeholder = "Search street address (Google Places)…";
      el.classList.add("rg-address-autocomplete-widget");
      el.id = hostId;

      const lastCommitted = { current: null as string | null };

      const onSelect = async (ev: Event) => {
        const e = ev as google.maps.places.PlacePredictionSelectEvent;
        const place = e.placePrediction.toPlace();
        try {
          await place.fetchFields({
            fields: ["formattedAddress", "addressComponents"],
          });
        } catch {
          lastCommitted.current = null;
          onSelRef.current(null);
          return;
        }
        const formatted = (place.formattedAddress || "").trim();
        const comp = place.addressComponents ?? [];
        if (!formatted || comp.length === 0) {
          lastCommitted.current = null;
          onSelRef.current(null);
          return;
        }
        const zip = extractZip5FromPlaceComponents(comp);
        if (!zip) {
          lastCommitted.current = null;
          onSelRef.current(null);
          return;
        }
        lastCommitted.current = formatted;
        onSelRef.current({ formattedAddress: formatted, zip });
      };

      const onInput = () => {
        const v = el.value.trim();
        if (
          lastCommitted.current !== null &&
          v === lastCommitted.current.trim()
        ) {
          return;
        }
        lastCommitted.current = null;
        onSelRef.current(null);
      };

      el.addEventListener("gmp-select", onSelect as EventListener);
      el.addEventListener("input", onInput);

      host.innerHTML = "";
      host.appendChild(el);
      widgetRef.current = el;

      teardown = () => {
        el.removeEventListener("gmp-select", onSelect as EventListener);
        el.removeEventListener("input", onInput);
        el.remove();
        widgetRef.current = null;
      };

      if (cancelled) {
        teardown();
      }
    })();

    return () => {
      cancelled = true;
      teardown?.();
      widgetRef.current = null;
      host.innerHTML = "";
    };
  }, [key, mapsReady, hostId]);

  useEffect(() => {
    const w = widgetRef.current;
    if (!w) {
      return;
    }
    if (disabled) {
      w.setAttribute("inert", "");
    } else {
      w.removeAttribute("inert");
    }
  }, [disabled]);

  const barClass =
    "rg-input rg-address-autocomplete" + (key ? "" : " rg-address-autocomplete--needs-key");

  if (!key) {
    return (
      <input
        id={`rg-addr-fallback-${reactId.replace(/:/g, "")}`}
        className={barClass}
        type="text"
        disabled
        placeholder="Set VITE_GOOGLE_MAPS_API_KEY to enable U.S. address search…"
        autoComplete="off"
        aria-labelledby="job-site-address-label"
      />
    );
  }

  return (
    <div
      ref={hostRef}
      className={`rg-place-autocomplete-host${mapsReady ? "" : " rg-place-autocomplete-host--loading"}`}
      data-loading={!mapsReady ? "" : undefined}
      aria-busy={!mapsReady}
      aria-labelledby="job-site-address-label"
    >
      {!mapsReady ? (
        <input
          className={barClass}
          type="text"
          disabled
          placeholder="Loading Maps…"
          autoComplete="off"
          readOnly
          aria-hidden
          tabIndex={-1}
        />
      ) : null}
    </div>
  );
}
