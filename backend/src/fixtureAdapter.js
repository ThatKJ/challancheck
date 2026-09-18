// DEV-ONLY adapter. Returns canned observations for UI development and demo
// purposes. Every result is tagged meta.source = "fixture" so it can never be
// mistaken for a live Bedrock call (see docs/AI_COORDINATION.md Product Truth
// and the human instruction: "Fixtures must never be represented as Bedrock
// output from a live run"). This file makes no AWS call and never will.

export const FIXTURE_SCENARIOS = [
  {
    id: "car_no_helmet",
    label: "Demo: car cited for 'no helmet'",
    violationText: "Riding without helmet",
    observation: {
      vehicle_type: { value: "car", confidence: 0.95 },
      people_visible: { value: 1, confidence: 0.9 },
      helmet: { status: "not_applicable", confidence: 0.9 },
      license_plate: { visible: true, text: "KA01AB1234", confidence: 0.8 },
      image_quality: "good",
      occlusion: "none",
      uncertainties: [],
    },
  },
  {
    id: "motorcycle_no_helmet_consistent",
    label: "Motorcycle rider with no helmet visible",
    violationText: "Riding without helmet",
    observation: {
      vehicle_type: { value: "motorcycle", confidence: 0.95 },
      people_visible: { value: 1, confidence: 0.95 },
      helmet: { status: "not_visible", confidence: 0.9 },
      license_plate: { visible: true, text: "KA05MN4567", confidence: 0.85 },
      image_quality: "good",
      occlusion: "none",
      uncertainties: [],
    },
  },
  {
    id: "motorcycle_helmet_visible_mismatch",
    label: "Motorcycle rider clearly wearing a helmet",
    violationText: "Riding without helmet",
    observation: {
      vehicle_type: { value: "motorcycle", confidence: 0.92 },
      people_visible: { value: 1, confidence: 0.9 },
      helmet: { status: "visible", confidence: 0.88 },
      license_plate: { visible: true, text: "KA06HH3333", confidence: 0.8 },
      image_quality: "good",
      occlusion: "none",
      uncertainties: [],
    },
  },
  {
    id: "blurry_insufficient",
    label: "Blurry / occluded evidence photo",
    violationText: "Riding without helmet",
    observation: {
      vehicle_type: { value: "motorcycle", confidence: 0.55 },
      people_visible: { value: 1, confidence: 0.5 },
      helmet: { status: "uncertain", confidence: 0.3 },
      license_plate: { visible: false, text: null, confidence: 0.1 },
      image_quality: "poor",
      occlusion: "severe",
      uncertainties: ["vehicle mostly cropped", "heavy compression"],
    },
  },
  {
    id: "speeding_unsupported",
    label: "Speeding claim (cannot be verified from a still photo)",
    violationText: "Over speeding",
    observation: {
      vehicle_type: { value: "car", confidence: 0.95 },
      people_visible: { value: 1, confidence: 0.9 },
      helmet: { status: "not_applicable", confidence: 0.9 },
      license_plate: { visible: true, text: "KA03XY7890", confidence: 0.9 },
      image_quality: "good",
      occlusion: "none",
      uncertainties: [],
    },
  },
  {
    id: "multi_claim_helmet_and_speeding",
    label: "Challan cites two offences (helmet + speeding)",
    violationText: "Overspeeding and driving without helmet",
    observation: {
      vehicle_type: { value: "car", confidence: 0.95 },
      people_visible: { value: 1, confidence: 0.9 },
      helmet: { status: "not_applicable", confidence: 0.9 },
      license_plate: { visible: true, text: "KA01AB1234", confidence: 0.8 },
      image_quality: "good",
      occlusion: "none",
      uncertainties: [],
    },
  },
];

/**
 * @param {string} scenarioId
 * @returns {Promise<{ observation: object, violationText: string, meta: { source: "fixture", scenarioId: string, label: string } }>}
 */
export async function observeEvidenceViaFixture(scenarioId) {
  const scenario = FIXTURE_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown fixture scenario: ${scenarioId}`);
  }
  return {
    observation: scenario.observation,
    violationText: scenario.violationText,
    meta: { source: "fixture", scenarioId: scenario.id, label: scenario.label },
  };
}
