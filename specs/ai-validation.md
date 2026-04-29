# AI Validation Rules

## Output Contract

All AI responses MUST follow:

{
  "type": "dashboard" | "insight" | "decision",
  "result": any,
  "confidence_score": number
}

## Validation Rules

- type is required
- result is required
- confidence_score must be between 0 and 1

## Rejection Conditions

Reject response if:

- Missing any required field
- confidence_score < 0 or > 1
- Invalid type value

## Safety Rule

If confidence_score < 0.7:
- mark as "needs_review"
- DO NOT auto execute