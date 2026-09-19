# Learning Log

Our learning focused on the architectural boundaries of multimodal AI inference, particularly the line between extracting observations and making decisions.

## Initial Assumption
When we started, our plan was to send the challan claim and the image to Amazon Bedrock and ask the multimodal model: "Is this challan correct?"

## What Failed
We realized this creates an untrustworthy legal inference boundary. The model would sometimes "guess" guilt or innocence based on low-confidence artifacts (like blurry text or obstructed views). Because the output was a black-box conclusion, a user could not safely rely on it, nor could we deterministically test it for adversarial edge cases. It effectively functioned as a "legal defense generator" built on probabilism.

## What Was Learned
To build a system with actual trust, the LLM must be strictly constrained to observation, not evaluation. 
- **Amazon Bedrock (Observation)**: The multimodal model is exceptional at structured factual extraction (e.g., "Is a helmet visible?", "What type of vehicle is this?").
- **Application Engine (Evaluation)**: Determining whether a factual observation contradicts a legal claim (e.g., "Car" vs "Without Helmet" violation) is a deterministic logic problem. 

## Resulting Design Change
We explicitly separated the architecture into two layers:
1. **Bedrock Observation Layer**: Bedrock receives the image and returns a strictly typed JSON schema of visual facts and confidence scores (`{ "vehicle_type": "car", "helmet": "not_applicable" }`). It has no knowledge of the legal claim.
2. **Deterministic Rule Engine**: An application-level rule matrix evaluates the Bedrock observations against the selected claim to produce a guaranteed, repeatable result (e.g., `OBSERVABLE_INCONSISTENCY` or `INSUFFICIENT_EVIDENCE`). 

By constraining Bedrock to observation and keeping logic in code, we learned how to build verifiable trust boundaries around generative AI.
