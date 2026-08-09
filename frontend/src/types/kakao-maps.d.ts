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
          getCenter: () => { getLat: () => number; getLng: () => number };
          setBounds: (bounds: unknown) => void;
          setLevel: (level: number) => void;
          getLevel: () => number;
          relayout?: () => void;
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
        Circle: new (options: {
          map?: unknown;
          center: unknown;
          radius: number;
          strokeWeight?: number;
          strokeColor?: string;
          strokeOpacity?: number;
          strokeStyle?: string;
          fillColor?: string;
          fillOpacity?: number;
        }) => {
          setMap: (map: unknown | null) => void;
          setPosition?: (pos: unknown) => void;
          setRadius?: (r: number) => void;
        };
        Polyline: new (options: {
          path: unknown[];
          strokeWeight?: number;
          strokeColor?: string;
          strokeOpacity?: number;
          strokeStyle?: string;
        }) => {
          setMap: (map: unknown | null) => void;
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
          removeListener: (target: unknown, type: string, handler: () => void) => void;
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
          Places: new () => {
            keywordSearch: (
              keyword: string,
              callback: (
                data: Array<{
                  id: string;
                  place_name: string;
                  address_name: string;
                  road_address_name?: string;
                  x: string;
                  y: string;
                  distance?: string;
                }>,
                status: string,
                pagination: {
                  current: number;
                  last: number;
                  hasNextPage: boolean;
                  gotoPage: (page: number) => void;
                }
              ) => void,
              options?: { location?: unknown; radius?: number; sort?: string }
            ) => void;
          };
          Status: {
            OK: string;
            ZERO_RESULT: string;
            ERROR: string;
          };
        };
      };
    };
  }
}
