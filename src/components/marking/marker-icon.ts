import L from "leaflet";

/** Google-Maps-style teardrop pin, tinted with the marking's colour code and
 *  anchored at the point (bottom tip). Used for point markers on all maps. */
export function markerPinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.82 20.18 0 13 0z" fill="${color}" stroke="#05070d" stroke-width="1.5"/>
      <circle cx="13" cy="13" r="5" fill="#05070d"/>
    </svg>`,
    iconSize: [26, 38],
    iconAnchor: [13, 38],
  });
}
