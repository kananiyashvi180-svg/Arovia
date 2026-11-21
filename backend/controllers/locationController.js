const path = require("path");
const gujaratData = require("../config/gujaratLocations.json");

// Centroids for all 33 Gujarat districts for instant fail-safe coordinate matching
const GUJARAT_DISTRICT_CENTROIDS = [
  { name: "Devbhumi Dwarka", primaryCity: "Dwarka", lat: 22.2442, lon: 68.9685 },
  { name: "Jamnagar", primaryCity: "Jamnagar", lat: 22.4707, lon: 70.0577 },
  { name: "Porbandar", primaryCity: "Porbandar", lat: 21.6417, lon: 69.6293 },
  { name: "Rajkot", primaryCity: "Rajkot", lat: 22.3039, lon: 70.8022 },
  { name: "Junagadh", primaryCity: "Junagadh", lat: 21.5222, lon: 70.4579 },
  { name: "Gir Somnath", primaryCity: "Veraval", lat: 20.9042, lon: 70.3667 },
  { name: "Amreli", primaryCity: "Amreli", lat: 21.6032, lon: 71.2223 },
  { name: "Bhavnagar", primaryCity: "Bhavnagar", lat: 21.7645, lon: 72.1519 },
  { name: "Botad", primaryCity: "Botad", lat: 22.1700, lon: 71.6700 },
  { name: "Surendranagar", primaryCity: "Surendranagar", lat: 22.7278, lon: 71.6378 },
  { name: "Morbi", primaryCity: "Morbi", lat: 22.8120, lon: 70.8236 },
  { name: "Kutch", primaryCity: "Bhuj", lat: 23.2420, lon: 69.6669 },
  { name: "Patan", primaryCity: "Patan", lat: 23.8493, lon: 72.1266 },
  { name: "Banaskantha", primaryCity: "Palanpur", lat: 24.1724, lon: 72.4346 },
  { name: "Mehsana", primaryCity: "Mehsana", lat: 23.5880, lon: 72.3693 },
  { name: "Sabarkantha", primaryCity: "Himatnagar", lat: 23.6000, lon: 73.0000 },
  { name: "Aravalli", primaryCity: "Modasa", lat: 23.3600, lon: 73.2800 },
  { name: "Gandhinagar", primaryCity: "Gandhinagar", lat: 23.2156, lon: 72.6369 },
  { name: "Ahmedabad", primaryCity: "Ahmedabad", lat: 23.0225, lon: 72.5714 },
  { name: "Kheda", primaryCity: "Nadiad", lat: 22.7500, lon: 72.6800 },
  { name: "Anand", primaryCity: "Anand", lat: 22.5645, lon: 72.9289 },
  { name: "Mahisagar", primaryCity: "Lunawada", lat: 23.1670, lon: 73.5830 },
  { name: "Panchmahal", primaryCity: "Godhra", lat: 22.7758, lon: 73.6149 },
  { name: "Dahod", primaryCity: "Dahod", lat: 22.8340, lon: 74.2540 },
  { name: "Vadodara", primaryCity: "Vadodara", lat: 22.3072, lon: 73.1812 },
  { name: "Chhota Udepur", primaryCity: "Chhota Udepur", lat: 22.3108, lon: 74.0125 },
  { name: "Narmada", primaryCity: "Rajpipla", lat: 21.8700, lon: 73.5000 },
  { name: "Bharuch", primaryCity: "Bharuch", lat: 21.7051, lon: 72.9959 },
  { name: "Surat", primaryCity: "Surat", lat: 21.1702, lon: 72.8311 },
  { name: "Tapi", primaryCity: "Vyara", lat: 21.1300, lon: 73.4000 },
  { name: "Navsari", primaryCity: "Navsari", lat: 20.9467, lon: 72.9520 },
  { name: "Dang", primaryCity: "Ahwa", lat: 20.7800, lon: 73.6800 },
  { name: "Valsad", primaryCity: "Valsad", lat: 20.5992, lon: 72.9342 },
];

function haversineKm(lat1, lon1, lat2, lon2) {
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

function findNearestDistrict(lat, lon) {
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

function normalizeStr(str) {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function resolveGujaratLocation(addr = {}, coords = null) {
  const rawCity =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.municipality ||
    "";
  const rawDistrict =
    addr.state_district || addr.district || addr.county || "";
  const rawTaluka = addr.county || addr.town || "";
  const rawArea =
    addr.neighbourhood || addr.suburb || addr.road || addr.quarter || "";

  const normDist = normalizeStr(rawDistrict);
  const normCity = normalizeStr(rawCity);
  const normTaluka = normalizeStr(rawTaluka);

  let matchedDistrict = null;

  // 1. Text-based matching: ONLY if strings are non-empty (prevents matching empty string to Ahmedabad)
  if (normDist || normTaluka || normCity) {
    matchedDistrict = gujaratData.districts.find((d) => {
      const nd = normalizeStr(d.name);
      return (
        (normDist && (nd.includes(normDist) || normDist.includes(nd))) ||
        (normDist && normDist.includes("dwaraka") && nd.includes("dwarka")) ||
        (normDist && normDist.includes("dwarka") && nd.includes("dwarka")) ||
        (normTaluka && normTaluka.includes("okhamandal") && nd.includes("dwarka")) ||
        (normCity && (normCity.includes("dwarka") || normCity.includes("dwaraka")) && nd.includes("dwarka"))
      );
    });

    if (!matchedDistrict && normCity) {
      for (const d of gujaratData.districts) {
        if (
          d.cities.some((c) => {
            const nc = normalizeStr(c.name);
            return (
              nc === normCity ||
              (nc && normCity.includes(nc)) ||
              (normCity && nc.includes(normCity))
            );
          })
        ) {
          matchedDistrict = d;
          break;
        }
      }
    }
  }

  // 2. Geographic Centroid Resolver: Match by actual coordinates
  let nearestCentroid = null;
  if (coords?.lat && coords?.lon) {
    nearestCentroid = findNearestDistrict(coords.lat, coords.lon);
    if (!matchedDistrict && nearestCentroid) {
      matchedDistrict = gujaratData.districts.find(
        (d) => normalizeStr(d.name) === normalizeStr(nearestCentroid.name)
      );
    }
  }

  // 3. Find city/taluka within matched district
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

  const isGujarat =
    (addr.state && addr.state.toLowerCase().includes("gujarat")) ||
    !!matchedDistrict;

  const districtName = matchedDistrict
    ? matchedDistrict.name
    : nearestCentroid
    ? nearestCentroid.name
    : rawDistrict || "Gujarat";

  const cityName = matchedCity
    ? matchedCity.name
    : nearestCentroid
    ? nearestCentroid.primaryCity
    : rawCity || "Gujarat";

  const talukaName = matchedCity
    ? matchedCity.taluka
    : rawTaluka || cityName;

  const areaName =
    rawArea || (matchedCity?.areas?.[0] ? matchedCity.areas[0] : "");

  return {
    city: cityName,
    district: districtName,
    taluka: talukaName,
    villageArea: areaName,
    state: addr.state || "Gujarat",
    country: addr.country || "India",
    postcode: addr.postcode || "",
    displayName: `${cityName}, ${districtName}, ${addr.state || "Gujarat"}`,
    isGujarat,
  };
}

// ── GET /api/location/reverse ──────────────────────────────────
const reverseGeocode = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude (-90 to 90) and longitude (-180 to 180) are required.",
      });
    }

    let resolved = null;
    let osmDisplayName = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
      const osmRes = await fetch(nominatimUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Arovia-Healthcare/1.0 (contact@arovia.in)",
        },
      });

      clearTimeout(timeout);

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address || {};
        osmDisplayName = osmData.display_name || "";
        resolved = resolveGujaratLocation(addr, { lat, lon });
      }
    } catch (e) {
      console.warn("External reverse geocode timeout/network notice:", e.message);
    }

    // Fail-safe: Resolve from GPS coordinates directly if external service was slow
    if (!resolved) {
      resolved = resolveGujaratLocation({}, { lat, lon });
    }

    res.status(200).json({
      success: true,
      data: {
        ...resolved,
        latitude: lat,
        longitude: lon,
        osmDisplayName: osmDisplayName || resolved.displayName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/location/districts ────────────────────────────────
const getDistricts = async (req, res) => {
  res.status(200).json({
    success: true,
    count: gujaratData.districts.length,
    data: gujaratData.districts,
  });
};

module.exports = {
  reverseGeocode,
  getDistricts,
  resolveGujaratLocation,
  findNearestDistrict,
};
