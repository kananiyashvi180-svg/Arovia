/**
 * Arovia Intelligent Symptom-to-Specialty Mapping Service
 * 
 * Reusable clinical triage knowledge base mapping patient symptoms
 * to appropriate healthcare departments and specialists.
 * 
 * Note: Informational triage guidance only, not a medical diagnosis.
 */

export const SYMPTOM_SPECIALTY_MAP = {
  // Respiratory & Viral
  'High Fever':           ['General Medicine', 'Internal Medicine'],
  'Fever':                ['General Medicine', 'Internal Medicine'],
  'Cough':                ['General Medicine', 'Internal Medicine', 'Pulmonology'],
  'Sore Throat':          ['General Medicine', 'ENT'],
  'Runny Nose':           ['General Medicine'],
  'Fatigue':              ['General Medicine', 'Internal Medicine'],
  'Body Ache':            ['General Medicine'],
  'Chills':               ['General Medicine', 'Internal Medicine'],

  // Neurological & Head
  'Severe Headache':      ['Neurology', 'General Medicine'],
  'Headache':             ['General Medicine', 'Neurology'],
  'Throbbing Migraine':   ['Neurology', 'General Medicine'],
  'Migraine':             ['Neurology', 'General Medicine'],
  'Dizziness':            ['General Medicine', 'Neurology'],
  'Vertigo':              ['Neurology', 'ENT'],
  'Loss of Balance':      ['Neurology'],

  // Cardiovascular & Thoracic (Emergency)
  'Chest Discomfort':     ['Emergency Department', 'Cardiology'],
  'Chest Pain':           ['Emergency Department', 'Cardiology'],
  'Breathing Difficulty': ['Emergency Department', 'Pulmonology', 'Cardiology'],
  'Shortness of Breath':  ['Emergency Department', 'Pulmonology', 'Cardiology'],
  'Heart Palpitations':   ['Cardiology', 'General Medicine'],

  // Gastrointestinal & Abdominal
  'Stomach Pain':         ['Gastroenterology', 'General Surgery', 'General Medicine'],
  'Stomach Cramps':       ['Gastroenterology', 'General Medicine'],
  'Acid Reflux':          ['Gastroenterology', 'General Medicine'],
  'Nausea':               ['General Medicine', 'Gastroenterology'],
  'Vomiting':             ['General Medicine', 'Gastroenterology'],
  'Indigestion':          ['Gastroenterology', 'General Medicine'],

  // Musculoskeletal & Orthopedic
  'Knee Pain':            ['Orthopedics'],
  'Knee Joint Pain':      ['Orthopedics'],
  'Joint Pain':           ['Orthopedics'],
  'Joint Swelling':       ['Orthopedics'],
  'Back Pain':            ['Orthopedics', 'Physiotherapy'],
  'Back Stiffness':       ['Orthopedics', 'Physiotherapy'],
  'Neck Pain':            ['Orthopedics', 'Physiotherapy'],
  'Muscle Weakness':      ['Neurology', 'Orthopedics'],

  // Dermatological
  'Skin Rash':            ['Dermatology'],
  'Itching':              ['Dermatology'],
  'Skin Redness':         ['Dermatology'],
  'Hives':                ['Dermatology'],

  // Ophthalmic & Vision
  'Blurred Vision':       ['Ophthalmology', 'Eye Hospital'],
  'Eye Pain':             ['Ophthalmology', 'Eye Hospital'],
  'Vision Changes':       ['Ophthalmology', 'Eye Hospital'],
  'Eye Redness':          ['Ophthalmology', 'Eye Hospital'],

  // Dental & Oral
  'Tooth Pain':           ['Dental Hospital', 'Dentistry'],
  'Dental Ache':          ['Dental Hospital'],
  'Gum Swelling':         ['Dental Hospital'],

  // ENT & Sensory
  'Ear Pain':             ['ENT', 'General Medicine'],
  'Hearing Loss':         ['ENT'],
};

// Immediate Critical Emergency Triggers
export const CRITICAL_EMERGENCY_SYMPTOMS = [
  'Chest Pain',
  'Chest Discomfort',
  'Breathing Difficulty',
  'Shortness of Breath',
  'Unconsciousness',
  'Seizures',
  'Severe Blood Loss',
];

// Curated UI symptom chips for quick selection
export const SUPPORTED_SYMPTOMS_CATALOG = [
  // Critical / High Priority
  { label: 'Chest Discomfort',     icon: '❤️‍🔥', category: 'Emergency / Cardiac', isEmergency: true },
  { label: 'Breathing Difficulty', icon: '🫁',   category: 'Emergency / Respiratory', isEmergency: true },
  { label: 'Severe Headache',      icon: '🧠',   category: 'Neurological' },
  { label: 'High Fever',           icon: '🌡️',   category: 'General Medicine' },

  // General & Respiratory
  { label: 'Cough',                icon: '😷',   category: 'General Medicine' },
  { label: 'Fatigue',              icon: '😴',   category: 'General Medicine' },
  { label: 'Throbbing Migraine',   icon: '💆',   category: 'Neurological' },
  { label: 'Dizziness',            icon: '🌀',   category: 'Neurological' },

  // Abdominal & Digestion
  { label: 'Stomach Pain',         icon: '🤢',   category: 'Gastroenterology' },
  { label: 'Nausea',               icon: '🤮',   category: 'Gastroenterology' },
  { label: 'Acid Reflux',          icon: '🔥',   category: 'Gastroenterology' },

  // Orthopedic & Musculoskeletal
  { label: 'Knee Pain',            icon: '🦵',   category: 'Orthopedics' },
  { label: 'Back Pain',            icon: '🦴',   category: 'Orthopedics' },
  { label: 'Joint Swelling',       icon: '🦿',   category: 'Orthopedics' },

  // Specialized: Skin, Eye, Dental, Ear
  { label: 'Skin Rash',            icon: '🔴',   category: 'Dermatology' },
  { label: 'Blurred Vision',       icon: '👁️',   category: 'Ophthalmology' },
  { label: 'Tooth Pain',           icon: '🦷',   category: 'Dental' },
  { label: 'Ear Pain',             icon: '👂',   category: 'ENT' },
];

/**
 * Check if any selected symptom is an emergency trigger
 */
export function isImmediateEmergency(selectedSymptoms = []) {
  return selectedSymptoms.some((s) =>
    CRITICAL_EMERGENCY_SYMPTOMS.some(
      (crit) => crit.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(crit.toLowerCase())
    )
  );
}

/**
 * Derive prioritized list of healthcare departments from selected symptoms
 */
export function deriveRelevantSpecialties(selectedSymptoms = []) {
  const counts = {};

  for (const sym of selectedSymptoms) {
    const key = Object.keys(SYMPTOM_SPECIALTY_MAP).find(
      (k) => k.toLowerCase() === sym.toLowerCase() || sym.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(sym.toLowerCase())
    );

    if (key && Array.isArray(SYMPTOM_SPECIALTY_MAP[key])) {
      SYMPTOM_SPECIALTY_MAP[key].forEach((spec) => {
        counts[spec] = (counts[spec] || 0) + 1;
      });
    }
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([spec]) => spec);

  return sorted.length > 0 ? sorted : ['General Medicine', 'Internal Medicine'];
}

