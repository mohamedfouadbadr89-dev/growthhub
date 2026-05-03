# Decision Engine

## Inputs

- campaign_metrics
- integrations
- historical data (7–30 days)

## Logic

### Anomaly Detection

- Detect drop in ROAS
- Detect spike in CPA
- Detect CTR decline

### Opportunity Detection

- High CTR + Low spend → scale
- High ROAS → increase budget

## Output

Each decision must include:

- type
- result
- confidence_score
- reasoning_steps
- suggested_action_id

## Prioritization

- High impact + High confidence → priority HIGH
- Medium → MEDIUM
- Low → LOW