import { haversineKm, etaMinutes } from "@/lib/core.mjs";
import { AREAS } from "@/lib/constants";

export interface Coordinates { latitude: number; longitude: number }

/**
 * Map abstraction. With MAPS_API_KEY set, geocode/route could call
 * Mapbox/Google/OSM. Without it we use seeded area coordinates and Haversine —
 * so the product is fully demonstrable offline.
 */
export const mapsEnabled = Boolean(process.env.MAPS_API_KEY);

export function geocodeArea(area: string): Coordinates {
  const found = AREAS.find((a) => a.name.toLowerCase() === area.toLowerCase());
  const fallback = AREAS[0];
  return { latitude: (found ?? fallback).latitude, longitude: (found ?? fallback).longitude };
}

export function distanceBetween(a: Coordinates, b: Coordinates): number {
  return haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
}

export function estimatedArrival(distanceKm: number): number {
  return etaMinutes(distanceKm);
}
