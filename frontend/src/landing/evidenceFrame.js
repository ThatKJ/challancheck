// The evidence frame on the landing page is a SCHEMATIC, not a photograph.
// public/evidence-frame.svg is drawn at the bounding boxes Amazon Rekognition DetectLabels
// returned for one recorded test run (car, driver, licence plate, and a vehicle at the left
// edge). It shows no real person, face or registration number.
//
// The photograph behind that run (demo_image.png) is deliberately never committed or served:
// its provenance and licence are unconfirmed and it shows a real person and a legible licence
// plate (docs/CANONICAL_RUN.md, section 2c).
export const EVIDENCE_FRAME = "/evidence-frame.svg";

export const EVIDENCE_FRAME_ALT =
  "Schematic of an evidence frame: a car, its driver and a licence plate, drawn as placeholder shapes";
