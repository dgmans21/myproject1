export {};

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number }
        ) => {
          setCenter: (latlng: unknown) => void;
          setBounds: (bounds: unknown) => void;
          setLevel: (level: number) => void;
        };
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => {
          extend: (latlng: unknown) => void;
        };
        Marker: new (options: {
          map?: unknown;
          position: unknown;
          title?: string;
        }) => {
          setMap: (map: unknown | null) => void;
          setPosition: (pos: unknown) => void;
        };
        MarkerClusterer: new (options: {
          map: unknown;
          averageCenter?: boolean;
          minLevel?: number;
          markers?: unknown[];
        }) => {
          addMarkers: (markers: unknown[]) => void;
          clear: () => void;
        };
        event: {
          addListener: (
            target: unknown,
            type: string,
            handler: () => void
          ) => void;
        };
        services: {
          Geocoder: new () => {
            addressSearch: (
              address: string,
              callback: (
                result: Array<{ y: string; x: string; address_name?: string }>,
                status: string
              ) => void
            ) => void;
          };
          Status: {
            OK: string;
          };
        };
      };
    };
  }
}
