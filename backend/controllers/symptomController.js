const SymptomSearch = require("../models/SymptomSearch");

// ── Comprehensive Clinical Knowledge Base for Symptom-to-Specialty Mapping ──
const SYMPTOM_RULES = [
  {
    keywords: ["chest pain", "chest discomfort", "shortness of breath", "radiating pain", "arm pain", "chest tightness", "heart pounding"],
    condition: "Acute Coronary Syndrome / Angina / Cardiac Distress",
    severity: "Emergency",
    probability: "High Concern",
    urgencyLevel: "Emergency",
    recommendedSpecialist: "Cardiology / Emergency Department",
    relevantSpecialties: ["Emergency Department", "Cardiology", "Internal Medicine"],
    explanation: "Chest discomfort or pain, especially with shortness of breath or radiation to arms, neck, or jaw, requires immediate emergency evaluation to rule out cardiac ischemia.",
    nextSteps: [
      "Immediately dial 108 (Ambulance) or 112 (Emergency) or proceed to the nearest emergency room with a Cath Lab.",
      "Sit or lie down in a comfortable position and avoid physical exertion.",
      "Do not drive yourself to the hospital.",
    ],
  },
  {
    keywords: ["breathing difficulty", "shortness of breath", "wheezing", "gasping", "breathlessness", "asthma attack"],
    condition: "Acute Respiratory Distress / Bronchospasm",
    severity: "Emergency",
    probability: "High Concern",
    urgencyLevel: "Emergency",
    recommendedSpecialist: "Emergency Department / Pulmonology",
    relevantSpecialties: ["Emergency Department", "Pulmonology", "General Medicine"],
    explanation: "Severe difficulty breathing or rapid respiratory fatigue can quickly compromise oxygenation and requires rapid medical assessment.",
    nextSteps: [
      "Call 108 or go to the nearest emergency hospital immediately.",
      "Sit upright to ease lung expansion.",
      "Use prescribed bronchodilator / rescue inhaler if already diagnosed with asthma/COPD.",
    ],
  },
  {
    keywords: ["fever", "high fever", "cough", "sore throat", "runny nose", "fatigue", "body ache", "chills"],
    condition: "Upper Respiratory Infection / Seasonal Viral Flu",
    severity: "Moderate",
    probability: "Common",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "General Medicine / Internal Medicine",
    relevantSpecialties: ["General Medicine", "Internal Medicine"],
    explanation: "Fever and cough commonly indicate an upper respiratory tract infection or viral flu. Most cases respond well to hydration, rest, and targeted medical advice.",
    nextSteps: [
      "Stay hydrated with warm liquids and rest adequately.",
      "Monitor body temperature regularly.",
      "Consult a General Physician if fever persists over 102°F or lasts more than 3 days.",
    ],
  },
  {
    keywords: ["severe headache", "headache", "migraine", "throbbing migraine", "throbbing", "sensitivity to light", "aura"],
    condition: "Migraine / Tension-Type Cephalea / Neurological Evaluation",
    severity: "Moderate",
    probability: "Likely",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Neurology / General Medicine",
    relevantSpecialties: ["Neurology", "General Medicine"],
    explanation: "Severe or throbbing head pain, especially when accompanied by light sensitivity, nausea, or visual disturbances, points toward migraine or tension cephalea.",
    nextSteps: [
      "Rest in a quiet, dark, well-ventilated room.",
      "Apply a cold or warm compress to forehead and neck.",
      "Seek urgent care immediately if headache is sudden and explosively severe ('thunderclap') or accompanied by neck stiffness or weakness.",
    ],
  },
  {
    keywords: ["stomach pain", "abdominal pain", "acid reflux", "stomach cramps", "heartburn", "indigestion", "gastric pain"],
    condition: "Acute Gastritis / Peptic Irritation / Gastroenteritis",
    severity: "Moderate",
    probability: "Frequent",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Gastroenterology / General Surgery",
    relevantSpecialties: ["Gastroenterology", "General Surgery", "General Medicine"],
    explanation: "Abdominal discomfort, acid reflux, or cramping may reflect gastritis, acid peptic disorder, or digestive tract inflammation.",
    nextSteps: [
      "Avoid spicy, greasy, or acidic foods and large meals.",
      "Take oral fluids or ORS in small sips if vomiting is present.",
      "Seek emergency surgical consultation if abdominal pain is acute, rigid, or localized in the right lower abdomen.",
    ],
  },
  {
    keywords: ["knee pain", "knee joint pain", "joint pain", "joint swelling", "stiffness", "swelling", "knee stiffness"],
    condition: "Osteoarthritis / Acute Joint Inflammation / Ligament Strain",
    severity: "Moderate",
    probability: "Moderate",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Orthopedics",
    relevantSpecialties: ["Orthopedics"],
    explanation: "Knee pain, swelling, and joint stiffness frequently stem from articular cartilage wear, meniscus strain, or synovial inflammation.",
    nextSteps: [
      "Practice R.I.C.E. protocol (Rest, Ice, Compression, Elevation) to reduce inflammation.",
      "Avoid strenuous weight-bearing, squatting, or jumping.",
      "Visit an Orthopedic specialist for clinical examination and diagnostic X-ray/MRI.",
    ],
  },
  {
    keywords: ["back pain", "back stiffness", "lumbar ache", "spine pain", "lower back pain"],
    condition: "Lumbar Strain / Vertebral Spondylosis",
    severity: "Moderate",
    probability: "Likely",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Orthopedics / Physiotherapy",
    relevantSpecialties: ["Orthopedics", "Physiotherapy"],
    explanation: "Back pain and spinal stiffness are predominantly caused by muscle spasm, poor posture, or vertebral disc degeneration.",
    nextSteps: [
      "Avoid heavy lifting, sudden twisting, and prolonged sedentary posture.",
      "Apply heat or cold packs to the affected lumbar region.",
      "Consult an Orthopedic doctor or Physiotherapist for spinal rehabilitation.",
    ],
  },
  {
    keywords: ["skin rash", "itching", "hives", "eczema", "dermatitis", "skin redness", "skin lesion"],
    condition: "Allergic Dermatitis / Urticaria / Cutaneous Reaction",
    severity: "Low to Moderate",
    probability: "Frequent",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Dermatology",
    relevantSpecialties: ["Dermatology"],
    explanation: "Cutaneous skin rash or pruritus indicates contact dermatitis, allergic hive reaction, or a dermatological infection.",
    nextSteps: [
      "Avoid scratching the affected area to prevent secondary bacterial infection.",
      "Apply soothing calamine or gentle fragrance-free moisturizer.",
      "Consult a Dermatologist if rash spreads rapidly or is accompanied by facial swelling.",
    ],
  },
  {
    keywords: ["blurred vision", "eye pain", "vision changes", "eye redness", "double vision"],
    condition: "Ophthalmic Strain / Refractive Disorder / Ocular Surface Disease",
    severity: "Moderate",
    probability: "Moderate",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Ophthalmology / Eye Hospital",
    relevantSpecialties: ["Ophthalmology", "Eye Hospital"],
    explanation: "Blurred vision or ocular discomfort requires professional eye examination to evaluate intraocular pressure, cornea, and retina.",
    nextSteps: [
      "Refrain from rubbing the eyes or wearing contact lenses.",
      "Rest eyes from digital screens and bright sunlight.",
      "Consult an Ophthalmologist promptly if vision loss is sudden.",
    ],
  },
  {
    keywords: ["dizziness", "vertigo", "lightheadedness", "loss of balance"],
    condition: "Benign Positional Vertigo / Vestibular Dysfunction / Vasovagal Response",
    severity: "Moderate",
    probability: "Moderate",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "General Medicine / Neurology",
    relevantSpecialties: ["General Medicine", "Neurology"],
    explanation: "Dizziness or spinning sensations frequently arise from inner ear vestibular imbalance, blood pressure fluctuations, or neurological causes.",
    nextSteps: [
      "Sit or lie down immediately when feeling lightheaded to prevent falls.",
      "Stay hydrated and avoid sudden postural changes.",
      "Seek medical review with a General Physician or Neurologist.",
    ],
  },
  {
    keywords: ["nausea", "vomiting", "feeling sick"],
    condition: "Gastric Irritation / Motion Sickness / Gastrointestinal Distress",
    severity: "Low to Moderate",
    probability: "Frequent",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "General Medicine / Gastroenterology",
    relevantSpecialties: ["General Medicine", "Gastroenterology"],
    explanation: "Nausea and vomiting may result from dietary triggers, viral stomach flu, or systemic digestive irritation.",
    nextSteps: [
      "Sip small amounts of clear fluids or electrolyte solutions.",
      "Avoid solid, fatty, or strongly aromatic foods until settled.",
      "Consult a physician if inability to retain liquids persists over 24 hours.",
    ],
  },
  {
    keywords: ["tooth pain", "dental ache", "gum swelling", "bleeding gums", "toothache"],
    condition: "Dental Caries / Pulpitis / Periodontal Inflammation",
    severity: "Low to Moderate",
    probability: "Likely",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "Dental Hospital / Dentistry",
    relevantSpecialties: ["Dental Hospital", "General Medicine"],
    explanation: "Tooth pain and gingival tenderness typically stem from tooth decay, pulp exposure, or localized periodontal infection.",
    nextSteps: [
      "Rinse gently with warm salt water.",
      "Avoid very hot, cold, or sugary foods.",
      "Schedule an appointment with a Dental clinic for evaluation.",
    ],
  },
  {
    keywords: ["ear pain", "ear discharge", "hearing difficulty", "ear fullness"],
    condition: "Otitis Media / Otitis Externa / Cerumen Impaction",
    severity: "Low to Moderate",
    probability: "Likely",
    urgencyLevel: "Standard Visit",
    recommendedSpecialist: "ENT / General Medicine",
    relevantSpecialties: ["General Medicine", "Internal Medicine"],
    explanation: "Ear pain frequently indicates an outer or middle ear infection or Eustachian tube dysfunction.",
    nextSteps: [
      "Keep the ear canal dry and avoid inserting cotton swabs.",
      "Use warm compress over the outside of the ear.",
      "Consult an ENT or General Physician for otoscopic examination.",
    ],
  },
];

// ── POST /api/symptoms/analyze ─────────────────────────────────
const analyzeSymptoms = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a list of symptoms to evaluate.",
      });
    }

    const lowerSymptoms = symptoms.map((s) => s.toLowerCase().trim());

    let matchedConditions = [];
    let highestUrgency = "Self-Care";
    const collectedSpecialties = new Set();

    // Match rules against submitted symptoms
    for (const rule of SYMPTOM_RULES) {
      const matchCount = rule.keywords.filter((kw) =>
        lowerSymptoms.some((s) => s.includes(kw) || kw.includes(s))
      ).length;

      if (matchCount > 0) {
        matchedConditions.push({
          name: rule.condition,
          severity: rule.severity,
          probability: matchCount > 1 ? "Strong Match" : rule.probability,
          explanation: rule.explanation,
          recommendedSpecialist: rule.recommendedSpecialist,
          relevantSpecialties: rule.relevantSpecialties,
          nextSteps: rule.nextSteps,
        });

        rule.relevantSpecialties.forEach((spec) => collectedSpecialties.add(spec));

        if (rule.urgencyLevel === "Emergency") {
          highestUrgency = "Emergency";
        } else if (rule.urgencyLevel === "Urgent Care" && highestUrgency !== "Emergency") {
          highestUrgency = "Urgent Care";
        } else if (rule.urgencyLevel === "Standard Visit" && highestUrgency === "Self-Care") {
          highestUrgency = "Standard Visit";
        }
      }
    }

    // Default fallback if no specific rule matched
    if (matchedConditions.length === 0) {
      const defaultSpecialties = ["General Medicine", "Internal Medicine"];
      defaultSpecialties.forEach((s) => collectedSpecialties.add(s));

      matchedConditions.push({
        name: "General Clinical Observation",
        severity: "Moderate",
        probability: "General Assessment",
        explanation: `Symptoms noted: ${symptoms.join(", ")}. An in-person consultation with a registered medical practitioner is recommended to establish a definitive diagnosis.`,
        recommendedSpecialist: "General Medicine / Internal Medicine",
        relevantSpecialties: defaultSpecialties,
        nextSteps: [
          "Record when symptoms started and any changing patterns.",
          "Keep track of your vital parameters (temperature, pulse, blood pressure).",
          "Consult a qualified physician for clinical examination.",
        ],
      });
      highestUrgency = "Standard Visit";
    }

    const relevantSpecialtiesList = Array.from(collectedSpecialties);

    // Record in history if user is authenticated
    let savedSearch = null;
    if (req.user && req.user._id) {
      savedSearch = await SymptomSearch.create({
        user: req.user._id,
        symptoms,
        possibleConditions: matchedConditions,
        urgencyLevel: highestUrgency,
      });
    }

    const isEmergency = highestUrgency === "Emergency";

    res.status(200).json({
      success: true,
      data: {
        id: savedSearch?._id,
        analyzedSymptoms: symptoms,
        urgencyLevel: highestUrgency,
        isEmergency,
        relevantSpecialties: relevantSpecialtiesList,
        primarySpecialty: relevantSpecialtiesList[0] || "General Medicine",
        possibleConditions: matchedConditions,
        emergencyGuidance: isEmergency
          ? "CRITICAL WARNING: These symptoms suggest a potential medical emergency. Do not wait for appointments. Immediately dial 108 (Ambulance) or 112 (National Emergency), or go directly to the nearest emergency department."
          : null,
        emergencyNumbers: {
          ambulance: "108",
          nationalEmergency: "112",
        },
        medicalDisclaimer:
          "Arovia AI provides informational triage guidance only. This is NOT a confirmed medical diagnosis. Always consult a qualified medical professional for health decisions. In life-threatening emergencies, dial 108 immediately.",
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/symptoms/history ──────────────────────────────────
const getSymptomHistory = async (req, res, next) => {
  try {
    const history = await SymptomSearch.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/symptoms/history ───────────────────────────────
const clearSymptomHistory = async (req, res, next) => {
  try {
    await SymptomSearch.deleteMany({ user: req.user._id });
    res.status(200).json({
      success: true,
      message: "Symptom history cleared successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  analyzeSymptoms,
  getSymptomHistory,
  clearSymptomHistory,
  SYMPTOM_RULES,
};
