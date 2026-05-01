import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const CALLBACK_PREFIX = "__rgGoogleMapsCb_";

/** After a Places selection: Google's formatted line + ZIP for optional server cross-check. */
export type AddressSelection = {
  formattedAddress: string;
  zip: string;
};

export type AddressAutocompleteHandle = {
  /** Fills widget text after server / GPS locate (Places selection path unchanged). */
  setLocatedAddress: (sel: AddressSelection) => void;
};

type Props = {
  disabled?: boolean;
  onSelection: (sel: AddressSelection | null) => void;
};

/** Loads from `frontend/.env` via Vite (`import.meta.env.VITE_GOOGLE_MAPS_API_KEY`); echoed in `index.html` preload. */
function mapsKey(): string {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  return typeof raw === "string" ? raw.trim() : "";
}

function extractZip5FromPlaceComponents(
  components: google.maps.places.AddressComponent[],
): string | null {
  const z = components.find((c) => c.types.includes("postal_code"));
  const digits = (z?.longText ?? "").replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : null;
}

/** Fallback when postal_code isn't in fetched components (sometimes omitted until full parse). */
function extractZip5FromFormattedAddress(formatted: string): string | null {
  const m = formatted.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (!m) {
    return null;
  }
  return m[1] ?? null;
}

export function mapsAutocompleteEnabled(): boolean {
  return mapsKey().length > 0;
}

export const AddressAutocomplete = forwardRef<AddressAutocompleteHandle, Props>(
  function AddressAutocomplete({ disabled, onSelection }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
    const lastCommittedAddr = useRef<string | null>(null);
    const onSelRef = useRef(onSelection);
    onSelRef.current = onSelection;
    const reactId = useId();
    const hostId = `rg-addr-host-${reactId.replace(/:/g, "")}`;
    const key = mapsKey();
    const [mapsReady, setMapsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      setLocatedAddress(sel: AddressSelection) {
        lastCommittedAddr.current = sel.formattedAddress.trim();
        const w = widgetRef.current as unknown as { value?: string } | null;
        if (w && typeof w.value === "string") {
          w.value = sel.formattedAddress;
        }
      },
    }));

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

        const onSelect = async (ev: Event) => {
          type SelEv = Partial<{
            placePrediction?: google.maps.places.PlacePrediction;
            place?: google.maps.places.Place;
          }>;
          const raw = ev as SelEv;
          let place: google.maps.places.Place | null = null;
          if (raw.placePrediction) {
            place = raw.placePrediction.toPlace();
          } else if (raw.place) {
            place = raw.place;
          }
          if (!place) {
            lastCommittedAddr.current = null;
            onSelRef.current(null);
            return;
          }
          try {
            await place.fetchFields({
              fields: ["formattedAddress", "addressComponents"],
            });
          } catch {
            lastCommittedAddr.current = null;
            onSelRef.current(null);
            return;
          }
          const formatted = (place.formattedAddress || "").trim();
          const comp = place.addressComponents ?? [];
          if (!formatted) {
            lastCommittedAddr.current = null;
            onSelRef.current(null);
            return;
          }
          let zip =
            extractZip5FromPlaceComponents(comp) ??
            extractZip5FromFormattedAddress(formatted);
          if (!zip) {
            lastCommittedAddr.current = null;
            onSelRef.current(null);
            return;
          }
          lastCommittedAddr.current = formatted;
          onSelRef.current({ formattedAddress: formatted, zip });
        };

        const onInput = () => {
          const v = el.value.trim();
          if (
            lastCommittedAddr.current !== null &&
            v === lastCommittedAddr.current.trim()
          ) {
            return;
          }
          lastCommittedAddr.current = null;
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
  },
);
