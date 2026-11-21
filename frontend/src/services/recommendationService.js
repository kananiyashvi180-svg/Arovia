import { getNearbyHospitals } from './medicalService';

/**
 * Fetch and categorize hospital recommendations based on user location and recommended specialties
 */
export async function fetchHospitalRecommendations({
  latitude,
  longitude,
  specialties = [],
  radiusKm = 15,
  sortBy = 'distance',
}) {
  if (!latitude || !longitude) {
    return {
      success: false,
      message: 'User coordinates are required for nearby recommendations.',
      specialtyMatches: [],
      additionalNearby: [],
      totalCount: 0,
      radiusKm,
    };
  }

  const specsParam = Array.isArray(specialties) && specialties.length > 0
    ? specialties.join(',')
    : undefined;

  try {
    const res = await getNearbyHospitals({
      latitude,
      longitude,
      radiusKm,
      specialties: specsParam,
      sortBy,
      autoExpand: 'true',
      limit: 50,
    });

    if (res?.success) {
      const allHospitals = Array.isArray(res.data) ? res.data : [];
      let specMatches = Array.isArray(res.specialtyMatches) ? res.specialtyMatches : [];
      let addlNearby = Array.isArray(res.additionalNearby) ? res.additionalNearby : [];

      // Fallback segregation if backend returned everything in data
      if (specMatches.length === 0 && allHospitals.length > 0 && specialties.length > 0) {
        const lowerSpecs = specialties.map((s) => s.toLowerCase());
        specMatches = allHospitals.filter((h) => {
          const typeMatch = h.type && lowerSpecs.some((ls) => h.type.toLowerCase().includes(ls));
          const specMatch = h.specialties && h.specialties.some((s) => lowerSpecs.some((ls) => s.toLowerCase().includes(ls)));
          const nameMatch = h.name && lowerSpecs.some((ls) => h.name.toLowerCase().includes(ls));
          return typeMatch || specMatch || nameMatch;
        });
        addlNearby = allHospitals.filter((h) => !specMatches.includes(h));
      } else if (specMatches.length === 0 && allHospitals.length > 0) {
        // If no specialty criteria specified, treat all as general facilities
        addlNearby = allHospitals;
      }

      return {
        success: true,
        specialtyMatches: specMatches,
        additionalNearby: addlNearby,
        totalCount: allHospitals.length,
        radiusKm: res.radiusKm || radiusKm,
        initialRadiusKm: res.initialRadiusKm || radiusKm,
        expanded: Boolean(res.expanded),
        expandedNote: res.expandedNote || null,
        targetSpecialties: specialties,
      };
    }

    return {
      success: false,
      specialtyMatches: [],
      additionalNearby: [],
      totalCount: 0,
      radiusKm,
    };
  } catch (error) {
    console.warn('Failed to fetch hospital recommendations:', error.message);
    return {
      success: false,
      error: error.message,
      specialtyMatches: [],
      additionalNearby: [],
      totalCount: 0,
      radiusKm,
    };
  }
}

