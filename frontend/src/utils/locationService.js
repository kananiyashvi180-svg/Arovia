import * as Location from 'expo-location';
import gujaratData from '../constants/gujaratLocations.json';
import { reverseGeocodeBackend } from '../services/medicalService';

// Comprehensive Gujarat District Centroids for Fail-Safe Proximity Matching
export const GUJARAT_DISTRICT_CENTROIDS = [
  { name: 'Devbhumi Dwarka', primaryCity: 'Dwarka', lat: 22.2442, lon: 68.9685 },
  { name: 'Jamnagar', primaryCity: 'Jamnagar', lat: 22.4707, lon: 70.0577 },
  { name: 'Porbandar', primaryCity: 'Porbandar', lat: 21.6417, lon: 69.6293 },
  { name: 'Rajkot', primaryCity: 'Rajkot', lat: 22.3039, lon: 70.8022 },
  { name: 'Junagadh', primaryCity: 'Junagadh', lat: 21.5222, lon: 70.4579 },
  { name: 'Gir Somnath', primaryCity: 'Veraval', lat: 20.9042, lon: 70.3667 },
  { name: 'Amreli', primaryCity: 'Amreli', lat: 21.6032, lon: 71.2223 },
  { name: 'Bhavnagar', primaryCity: 'Bhavnagar', lat: 21.7645, lon: 72.1519 },
  { name: 'Botad', primaryCity: 'Botad', lat: 22.1700, lon: 71.6700 },
  { name: 'Surendranagar', primaryCity: 'Surendranagar', lat: 22.7278, lon: 71.6378 },
  { name: 'Morbi', primaryCity: 'Morbi', lat: 22.8120, lon: 70.8236 },
  { name: 'Kutch', primaryCity: 'Bhuj', lat: 23.2420, lon: 69.6669 },
  { name: 'Patan', primaryCity: 'Patan', lat: 23.8493, lon: 72.1266 },
  { name: 'Banaskantha', primaryCity: 'Palanpur', lat: 24.1724, lon: 72.4346 },
  { name: 'Mehsana', primaryCity: 'Mehsana', lat: 23.5880, lon: 72.3693 },
  { name: 'Sabarkantha', primaryCity: 'Himatnagar', lat: 23.6000, lon: 73.0000 },
  { name: 'Aravalli', primaryCity: 'Modasa', lat: 23.3600, lon: 73.2800 },
  { name: 'Gandhinagar', primaryCity: 'Gandhinagar', lat: 23.2156, lon: 72.6369 },
  { name: 'Ahmedabad', primaryCity: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { name: 'Kheda', primaryCity: 'Nadiad', lat: 22.7500, lon: 72.6800 },
  { name: 'Anand', primaryCity: 'Anand', lat: 22.5645, lon: 72.9289 },
  { name: 'Mahisagar', primaryCity: 'Lunawada', lat: 23.1670, lon: 73.5830 },
  { name: 'Panchmahal', primaryCity: 'Godhra', lat: 22.7758, lon: 73.6149 },
  { name: 'Dahod', primaryCity: 'Dahod', lat: 22.8340, lon: 74.2540 },
  { name: 'Vadodara', primaryCity: 'Vadodara', lat: 22.3072, lon: 73.1812 },
  { name: 'Chhota Udepur', primaryCity: 'Chhota Udepur', lat: 22.3108, lon: 74.0125 },
  { name: 'Narmada', primaryCity: 'Rajpipla', lat: 21.8700, lon: 73.5000 },
  { name: 'Bharuch', primaryCity: 'Bharuch', lat: 21.7051, lon: 72.9959 },
  { name: 'Surat', primaryCity: 'Surat', lat: 21.1702, lon: 72.8311 },
  { name: 'Tapi', primaryCity: 'Vyara', lat: 21.1300, lon: 73.4000 },
  { name: 'Navsari', primaryCity: 'Navsari', lat: 20.9467, lon: 72.9520 },
  { name: 'Dang', primaryCity: 'Ahwa', lat: 20.7800, lon: 73.6800 },
  { name: 'Valsad', primaryCity: 'Valsad', lat: 20.5992, lon: 72.9342 },
];

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function findNearestGujaratDistrict(lat, lon) {
  let best = null;
  let minDist = Infinity;
  for (const d of GUJARAT_DISTRICT_CENTROIDS) {
    const dist = haversineKm(lat, lon, d.lat, d.lon);
    if (dist < minDist) {
      minDist = dist;
      best = { ...d, distKm: Math.round(dist * 10) / 10 };
    }
  }
  return best;
}

// Unified flat list of cities across all 33 Gujarat districts
export const GUJARAT_CITY_OPTIONS = gujaratData.districts.flatMap((d) =>
  d.cities.map((c) => ({
    name: `${c.name}, ${d.name}`,
    cityName: c.name,
    districtName: d.name,
    taluka: c.taluka,
  }))
);

/**
 * Find approximate Gujarat district centroid coordinates for a city or district name
 * Used as fallback when device geocoder is unavailable for a manually selected city.
 */
export function findCentroidByCityOrDistrict(cityName = '', districtName = '') {
  const normCity = normalizeStr(cityName);
  const normDist = normalizeStr(districtName);

  if (normDist) {
    const byDist = GUJARAT_DISTRICT_CENTROIDS.find(
      (d) => normalizeStr(d.name) === normDist || normalizeStr(d.name).includes(normDist) || normDist.includes(normalizeStr(d.name))
    );
    if (byDist) return byDist;
  }

  if (normCity) {
    const byPrimary = GUJARAT_DISTRICT_CENTROIDS.find(
      (d) => normalizeStr(d.primaryCity) === normCity || normCity.includes(normalizeStr(d.primaryCity))
    );
    if (byPrimary) return byPrimary;

    for (const d of gujaratData.districts) {
      if (d.cities.some((c) => normalizeStr(c.name) === normCity || normCity.includes(normalizeStr(c.name)))) {
        const matchedCentroid = GUJARAT_DISTRICT_CENTROIDS.find(
          (c) => normalizeStr(c.name) === normalizeStr(d.name)
        );
        if (matchedCentroid) return matchedCentroid;
      }
    }
  }

  return null;
}

function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function matchDistrictAndCity(rawDist, rawCity, rawTaluka, coords = null) {
  const normDist = normalizeStr(rawDist);
  const normCity = normalizeStr(rawCity);
  const normTaluka = normalizeStr(rawTaluka);

  let matchedDistrict = null;

  // 1. Text-based matching: ONLY if strings are non-empty
  if (normDist || normTaluka || normCity) {
    matchedDistrict = gujaratData.districts.find((d) => {
      const nd = normalizeStr(d.name);
      return (
        (normDist && (nd.includes(normDist) || normDist.includes(nd))) ||
        (normDist && normDist.includes('dwaraka') && nd.includes('dwarka')) ||
        (normDist && normDist.includes('dwarka') && nd.includes('dwarka')) ||
        (normTaluka && normTaluka.includes('okhamandal') && nd.includes('dwarka')) ||
        (normCity && (normCity.includes('dwarka') || normCity.includes('dwaraka')) && nd.includes('dwarka'))
      );
    });

    if (!matchedDistrict && normCity) {
      for (const d of gujaratData.districts) {
        if (
          d.cities.some(
            (c) =>
              normalizeStr(c.name) === normCity ||
              (normCity && normalizeStr(c.name).includes(normCity)) ||
              (normalizeStr(c.name) && normCity.includes(normalizeStr(c.name)))
          )
        ) {
          matchedDistrict = d;
          break;
        }
      }
    }
  }

  // 2. Geographic Centroid Resolver: Match by actual coordinates
  let nearestCentroid = null;
  if (coords?.latitude && coords?.longitude) {
    nearestCentroid = findNearestGujaratDistrict(coords.latitude, coords.longitude);
    if (!matchedDistrict && nearestCentroid) {
      matchedDistrict = gujaratData.districts.find(
        (d) => normalizeStr(d.name) === normalizeStr(nearestCentroid.name)
      );
    }
  }

  // 3. Find city within matched district
  let matchedCity = null;
  if (matchedDistrict) {
    if (normCity) {
      matchedCity = matchedDistrict.cities.find((c) => {
        const nc = normalizeStr(c.name);
        return (
          nc === normCity ||
          (normCity && nc.includes(normCity)) ||
          (nc && normCity.includes(nc))
        );
      });
    }

    if (!matchedCity && normTaluka) {
      matchedCity = matchedDistrict.cities.find((c) => {
        const nt = normalizeStr(c.taluka);
        return nt && (nt.includes(normTaluka) || normTaluka.includes(nt));
      });
    }

    if (!matchedCity) {
      matchedCity = matchedDistrict.cities[0];
    }
  }

  return { matchedDistrict, matchedCity, nearestCentroid };
}

/**
 * High-accuracy multi-tier reverse geocode function
 * Tier 1: Device Native Geocoder (Google Play Services / iOS CoreLocation)
 * Tier 2: Arovia Backend Reverse Geocode Endpoint
 * Tier 3: Gujarat Centroid Geographic Matcher
 */
export async function reverseGeocodeLocation(latitude, longitude) {
  let city = '';
  let district = '';
  let state = 'Gujarat';
  let taluka = '';
  let villageArea = '';
  let postalCode = '';
  let country = 'India';

  // Tier 1: Native device geocoder
  try {
    const rev = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (rev && rev.length > 0) {
      const place = rev[0];
      const rawCity = place.city || place.subregion || place.district || '';
      const rawDist = place.district || place.subregion || '';
      const rawTaluka = place.subregion || rawCity;
      postalCode = place.postalCode || '';
      villageArea = place.name || place.street || '';
      state = place.region || 'Gujarat';
      country = place.country || 'India';

      const { matchedDistrict, matchedCity } = matchDistrictAndCity(
        rawDist,
        rawCity,
        rawTaluka,
        { latitude, longitude }
      );

      if (matchedDistrict) {
        district = matchedDistrict.name;
        city = matchedCity ? matchedCity.name : rawCity;
        taluka = matchedCity?.taluka || rawTaluka || city;
        if (!villageArea && matchedCity?.areas?.[0]) {
          villageArea = matchedCity.areas[0];
        }
      } else {
        city = rawCity;
        district = rawDist;
        taluka = rawTaluka;
      }
    }
  } catch (nativeErr) {
    console.warn('Native reverse-geocode note:', nativeErr.message);
  }

  // Tier 2: Backend API fallback if native did not provide a confident Gujarat district
  if (!district || district === 'Gujarat') {
    try {
      const res = await reverseGeocodeBackend(latitude, longitude);
      if (res?.data && !res.data.isFallback) {
        city = res.data.city || city;
        district = res.data.district || district;
        taluka = res.data.taluka || taluka;
        villageArea = res.data.villageArea || villageArea;
        postalCode = res.data.postcode || postalCode;
        state = res.data.state || state;
      }
    } catch (backendErr) {
      console.warn('Backend reverse-geocode note:', backendErr.message);
    }
  }

  // Tier 3: Geographical centroid resolver (Fail-safe guarantee)
  if (!district || district === 'Gujarat' || !city) {
    const nearest = findNearestGujaratDistrict(latitude, longitude);
    if (nearest) {
      district = nearest.name;
      city = city || nearest.primaryCity;
      taluka = taluka || city;
    }
  }

  const displayName = `${city}, ${district}${state ? `, ${state}` : ''}`;
  const formattedAddress = [villageArea, city, district, state, postalCode]
    .filter(Boolean)
    .join(', ');

  return {
    city,
    district,
    state,
    taluka,
    villageArea,
    postalCode,
    country,
    displayName,
    formattedAddress,
    latitude,
    longitude,
  };
}
