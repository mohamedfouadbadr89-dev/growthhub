# PYTHON CREATIVE RUNTIME — GOVERNANCE SPEC



STATUS: GOVERNANCE-SAFE TOOLING / ENVIRONMENT ONLY



OWNER PHASE:

- Primary ownership: Phase 5 — Creatives

- Future orchestration dependency: Phase X — AI Orchestration

- Future execution dependency: late Phase 6 / Phase 7 (ONLY if explicitly authorized)



---



# PURPOSE



Python creative runtime exists as an isolated AI/media execution substrate

for creative experimentation, DSPy pipelines, embeddings, diffusion workflows,

video tooling, multimodal processing, and future governed AI execution.



This runtime is NOT a production backend runtime.



This runtime currently exists ONLY as:

- local tooling

- experimentation environment

- creative/media substrate

- offline execution environment

- future AI/media execution preparation



It MUST NOT become:

- a secondary backend

- shadow orchestration system

- duplicate API layer

- production routing layer

- independent execution authority



Node backend remains the canonical production runtime.



---



# CURRENT GOVERNANCE CLASSIFICATION



CLASSIFICATION:

GOVERNANCE-SAFE TOOLING / ENVIRONMENT



NOT:

- new phase implementation

- backend expansion

- orchestration unlock

- production runtime

- service layer expansion



This runtime is intentionally isolated from:

- backend production runtime

- routing layer

- database layer

- orchestration authority

- frontend execution layer



---



# PHASE OWNERSHIP



## CURRENT PHASE RELATION



Phase 5 — Creatives:

Python runtime supports:

- creative experimentation

- image tooling

- video tooling

- prompt workflows

- creative metadata workflows

- future creative execution preparation



Phase X — AI Orchestration:

Future orchestration governance MAY eventually control:

- DSPy execution

- prompt optimization

- AI routing

- multimodal pipelines

- tool execution

- provider abstraction



BUT:

Phase X orchestration is NOT authorized yet.



---



# ARCHITECTURAL POSITION



Current architecture:



Frontend

↓

Node Backend (canonical authority)

↓

Service Layer

↓

Database



Python runtime currently exists BESIDE the architecture,

NOT inside it.



Future governed model MAY become:



Frontend

↓

Node Backend (canonical)

↓

Governed AI Orchestrator

↓

Python Creative Runtime (isolated execution substrate)



Python MUST NEVER bypass:

- backend contracts

- org_id enforcement

- canonical logging

- governance

- execution tracing

- AI execution contracts



---



# CURRENT AUTHORIZED SCOPE



AUTHORIZED:



- isolated Python environment

- DSPy experimentation

- embeddings experimentation

- diffusion experimentation

- prompt pipelines

- ffmpeg tooling

- image tooling

- video tooling

- local AI/media execution

- creative prototyping

- local verification scripts

- runtime dependency management

- creative runtime validation



ALLOWED:

- local-only execution

- operator-side tooling

- experimentation

- offline processing

- future runtime preparation



---



# STRICTLY FORBIDDEN



FORBIDDEN WITHOUT EXPLICIT AUTHORIZATION:



- FastAPI

- Flask

- Django

- HTTP services

- workers

- Celery

- RQ

- Dramatiq

- orchestration runtimes

- queue systems

- schedulers

- DB writes

- Supabase direct access

- frontend coupling

- production API ownership

- routing changes

- execution authority ownership

- MCP ownership

- production automation execution

- shadow infrastructure

- duplicate orchestration systems

- background services

- daemon processes



Python runtime MUST NEVER become:

- production backend replacement

- secondary execution authority

- parallel architecture



---



# CURRENT INSTALLED LIBRARIES



## DSPy



Purpose:

- LLM orchestration experimentation

- prompt optimization

- reasoning pipelines

- structured AI workflows

- evaluation pipelines



NOT CURRENTLY AUTHORIZED FOR:

- production orchestration ownership

- autonomous execution

- production routing



---



## ffmpeg-python



Purpose:

- video processing

- audio processing

- transcoding pipelines

- creative rendering preparation



Depends on:

- system ffmpeg binary



---



## Pillow



Purpose:

- image processing

- creative asset manipulation

- thumbnail generation

- image transformations



---



## numpy



Purpose:

- tensor/data operations

- embeddings preparation

- numerical workflows

- AI/media processing support



---



## imageio



Purpose:

- image/video IO

- media loading/saving

- frame processing



---



## python-dotenv



Purpose:

- local runtime env loading

- operator-side experimentation



NOT production secret orchestration.



---



# FUTURE GOVERNED CANDIDATE LIBRARIES



NOT AUTHORIZED YET.



These remain PENDING until explicit governance unlock.



Potential future candidates:



- diffusers

- transformers

- accelerate

- sentence-transformers

- torch

- xformers

- opencv-python

- moviepy

- rembg

- controlnet_aux

- onnxruntime

- safetensors



Future usage MAY include:

- diffusion execution

- image generation

- embeddings generation

- multimodal workflows

- creative optimization

- AI-assisted rendering

- local inference



---



# FUTURE API-BASED EXECUTION (PENDING)



NOT AUTHORIZED YET.



The system MAY eventually integrate with external AI/media providers:



- OpenAI Images

- Runway

- Replicate

- Stability

- Kling

- Pika

- ElevenLabs



IMPORTANT:



API keys are intentionally NOT added yet.



Current work MUST remain:

- provider-agnostic

- architecture-safe

- governance-safe

- non-production



Future provider integrations MUST:

- remain under Node backend governance

- preserve canonical orchestration

- preserve AI logging

- preserve request tracing

- preserve org isolation

- preserve execution contracts

- preserve ai_logs integrity

- preserve cost tracking

- preserve usage accounting



Python runtime MUST NEVER directly own:

- billing

- credits

- org authorization

- execution governance

- API governance



Those remain backend responsibilities.



---



# RELATION TO PHASE X



Phase X — AI Orchestration is expected to eventually govern:



- tool execution

- provider routing

- model routing

- AI execution contracts

- DSPy execution control

- multimodal orchestration

- AI logging fan-out

- strategy_tag execution routing



BUT:

Phase X remains governance-locked until explicitly authorized.



Python runtime preparation MUST NOT prematurely implement:

- orchestration

- MCP routing

- autonomous execution

- runtime governance

- execution ownership



---



# RELATION TO PHASE 5



Phase 5 — Creatives is the PRIMARY OWNER of this runtime.



This runtime exists specifically to support future:

- AI creative generation

- creative metadata generation

- image workflows

- video workflows

- multimodal creatives

- creative optimization pipelines

- creative performance experimentation



Including future support for:

- feedback loops

- creative → performance linking

- prompt metadata

- generation metadata



WITHOUT violating:

- architecture isolation

- governance boundaries

- phase locks



---



# API KEY POLICY



Current status:

NO AI/media provider API keys are required yet.



Future API keys MAY include:

- OpenAI

- Replicate

- Stability

- Runway

- Kling

- Pika

- ElevenLabs



API keys MUST NOT be added until:

- provider abstraction exists

- governance unlock exists

- orchestration contracts exist

- AI logging exists

- execution tracing exists

- cost tracking exists



Preparation work MUST remain API-provider-agnostic until authorization.



---



# GOVERNANCE RULE



If future Python-related work introduces:

- services

- workers

- orchestration ownership

- routing

- DB writes

- background execution

- automation ownership



STOP.



Explicit governance authorization is REQUIRED first.



---



# SAFE SUCCESS CONDITION



Python runtime is considered HEALTHY if:



- isolated

- tooling-only

- architecture-safe

- phase-safe

- governance-safe

- non-production

- non-authoritative

- reversible

- non-invasive



NOT if:

- it owns execution

- it owns orchestration

- it owns APIs

- it owns automation

- it becomes a second backend



---



# FINAL ARCHITECTURE RULE



Frontend

→ Backend API

→ Service Layer

→ Database



REMAINS THE CANONICAL SYSTEM.



Python creative runtime exists ONLY as:

- isolated execution substrate

- tooling layer

- future governed AI/media runtime



under backend governance.