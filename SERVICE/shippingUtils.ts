/**
 * Calculate shipping cost based on distance
 * This matches the backend calculation logic
 * 
 * Pricing breakdown (by distance):
 * - 0-10 km: 500 KES
 * - 11-25 km: 800 KES
 * - 26-50 km: 1200 KES
 * - 51-100 km: 1800 KES
 * - 100+ km: 2500 KES
 */

export const calculateShipping = (distanceKm: number): number => {
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
 * Get shipping cost description for UI display
 */
export const getShippingDescription = (distanceKm: number): string => {
  if (distanceKm <= 10) {
    return `${Math.round(distanceKm)}km (Local) - 500 KES`;
  } else if (distanceKm <= 25) {
    return `${Math.round(distanceKm)}km (Regional) - 800 KES`;
  } else if (distanceKm <= 50) {
    return `${Math.round(distanceKm)}km (Regional+) - 1200 KES`;
  } else if (distanceKm <= 100) {
    return `${Math.round(distanceKm)}km (Long Distance) - 1800 KES`;
  } else {
    return `${Math.round(distanceKm)}km (Extra Long) - 2500 KES`;
  }
};
