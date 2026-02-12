import axios from "axios";
import { logger } from "./logger";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface GeocodeResult {
  lat: string;
  lon: string;
}

/**
 * Use Nominatim (free OpenStreetMap API) to geocode a city name to coordinates
 * Nominatim is free and doesn't require an API key
 * @param city - City name (e.g., "Nairobi", "Kisumu")
 * @returns { latitude, longitude } or null if not found
 */
export const geocodeCity = async (city: string): Promise<Coordinates | null> => {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: city,
        format: "json",
        limit: 1,
      },
      timeout: 5000,
      headers: {
        "User-Agent": "FurnitureApp/1.0", // Nominatim requires a User-Agent
      },
    });

    if (!response.data || response.data.length === 0) {
      logger.warn(`⚠️ City not found: "${city}"`);
      return null;
    }

    const result: GeocodeResult = response.data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
  } catch (error) {
    logger.error(
      `❌ Geocoding error for city "${city}": ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return null;
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 * @param coord1 - Starting coordinates
 * @param coord2 - Ending coordinates
 * @returns Distance in kilometers
 */
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
      Math.cos(toRad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Convert degrees to radians
 */
const toRad = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate shipping fee based on distance
 * @param distanceKm - Distance in kilometers
 * @returns Shipping fee in the local currency (KES)
 *
 * Pricing breakdown:
 * - 0-10 km: 500 KES
 * - 11-25 km: 800 KES
 * - 26-50 km: 1200 KES
 * - 51-100 km: 1800 KES
 * - 100+ km: 2500 KES
 */
export const calculateShippingByDistance = (distanceKm: number): number => {
  if (distanceKm <= 10) {
    return 500;
  } else if (distanceKm <= 25) {
    return 800;
  } else if (distanceKm <= 50) {
    return 1200;
  } else if (distanceKm <= 100) {
    return 1800;
  } else {
    return 2500;
  }
};

/**
 * Get shipping info: distance, fee, and log details
 */
export const getShippingInfo = async (
  sellerCity: string,
  buyerCity: string,
  sellerLat?: number,
  sellerLon?: number
): Promise<{ distance: number; fee: number } | null> => {
  try {
    logger.info(`📍 Calculating shipping from "${sellerCity}" to "${buyerCity}"`);

    // If seller has saved coordinates, use them; otherwise geocode
    let sellerCoords: Coordinates | null;
    if (sellerLat && sellerLon) {
      sellerCoords = { latitude: sellerLat, longitude: sellerLon };
      logger.info(`📌 Using saved seller coordinates: (${sellerLat}, ${sellerLon})`);
    } else {
      sellerCoords = await geocodeCity(sellerCity);
    }

    if (!sellerCoords) {
      logger.error(`❌ Could not find coordinates for seller city: "${sellerCity}"`);
      return null;
    }

    const buyerCoords = await geocodeCity(buyerCity);
    if (!buyerCoords) {
      logger.error(`❌ Could not find coordinates for buyer city: "${buyerCity}"`);
      return null;
    }

    const distance = calculateDistance(sellerCoords, buyerCoords);
    const shippingFee = calculateShippingByDistance(distance);

    logger.info(`✅ Distance: ${distance} km | Shipping Fee: ${shippingFee} KES`);

    return {
      distance,
      fee: shippingFee,
    };
  } catch (error) {
    logger.error(
      `❌ Error calculating shipping: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return null;
  }
};
