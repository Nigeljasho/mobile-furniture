/**
  * Shipping cost calculation based on distance.
 * Pricing breakdown (by distance):
 * - 0-10 km: 100 KES
 * - 11-30 km: 500 KES
 * - 31-50 km: 800 KES
 * - 51-70 km: 1200 KES
 * - 71-100 km: 1800 KES
 * - 101-200 km: 2500 KES
 * - 200+ km: 3000 KES
 */

export const calculateShipping = (distanceKm: number): number => {
  if (distanceKm <= 10) {
    return 100;
  } else if (distanceKm <= 30) {
    return 500;
  } else if (distanceKm <= 50) {
    return 800;
  } else if (distanceKm <= 70) {
    return 1200;
  } else if (distanceKm <= 100) {
    return 1800;
  } else if (distanceKm <= 200) {
    return 2500;
  } else {
    return 3000;
  }
};

/**
 * Get shipping cost description for UI display
 */
export const getShippingDescription = (distanceKm: number): string => {
  if (distanceKm <= 10) {
    return `${Math.round(distanceKm)}km (Local) - 100 KES`;
  } else if (distanceKm <= 30) {
    return `${Math.round(distanceKm)}km (Regional) - 500 KES`;
  } else if (distanceKm <= 50) {
    return `${Math.round(distanceKm)}km (Regional+) - 800 KES`;
  } else if (distanceKm <= 70) {
    return `${Math.round(distanceKm)}km (Regional+) - 1200 KES`;
  } else if (distanceKm <= 100) {
    return `${Math.round(distanceKm)}km (Long Distance) - 1800 KES`;
  } else if (distanceKm <= 200) {
    return `${Math.round(distanceKm)}km (Extra Long) - 2500 KES`;
  } else {
    return `${Math.round(distanceKm)}km (Ultra Long) - 3000 KES`;
  }
};
