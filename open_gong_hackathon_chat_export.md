## Turn 20 — User

> biggest change is that we are making gong. apart from the main feature what all feature we can add which catches the demo and makes a huge impact

## Turn 21 — Assistant

If you're now doing **OpenGong Lite**, don't try to win by adding 20 Gong-like features.

The core from the PPT is:

**audio → transcript → summary / objections / intent / next steps / follow-up → every claim backed by exact transcript evidence.**

The differentiation should be:

> **Don't just summarize the call. Show the seller what actually matters, prove it, and tell them exactly what to do next.**

### 1. Customer Truth

The strongest addition.

Only statements explicitly made by the customer:

```text
CUSTOMER TRUTH

🟢 Confirmed pain
"We're losing around 6 hours every week manually
routing these calls."

14:32 · Sarah
[▶ Play evidence]


🟢 Buying intent
"If you can support Salesforce, I think we're
good to move forward."

22:18 · Sarah
[▶ Play evidence]


🔴 Blocker
"Our security team has to approve any new vendor."

26:04 · Sarah
[▶ Play evidence]


🟡 Unconfirmed
Budget approval

No evidence found.
```

The product says:

> **“Show me what the buyer actually said.”**

### 2. Click evidence → play exact audio

Don't just jump to the transcript.

Play the actual 10-second moment:

```text
OBJECTION

"Pricing is higher than what we're paying today."

Evidence
──────────────────────────────────
21:14 Customer

"We currently pay about $400.
This would be almost double."

[ ▶ PLAY 12 SEC ]   [ VIEW TRANSCRIPT ]
```

Demo line:

> “AI says price is an objection. Why should I trust it?”

Click.

The actual customer audio plays.

### 3. Rep said vs Customer said

Signature feature:

```text
DEAL REALITY CHECK

Rep said:
"Customer is ready to purchase this month."

Customer actually said:
"We still need to evaluate two other vendors."

⚠️ OVERSTATED INTENT

Evidence → 31:42
[▶ Play]
```

Or:

```text
Rep:
"They agreed to a follow-up next week."

Customer:
"Send me something and I'll get back to you."

⚠️ NO EXPLICIT COMMITMENT
```

Call it:

- Reality Check
- Deal Truth

Pitch:

> “Most tools summarize what happened. We tell you whether the deal you think you have is the deal the customer actually described.”

### 4. Commitment Ledger

```text
COMMITMENTS

YOUR TEAM
─────────────────────────────────

✓ Send SOC2 documentation
  Owner: Rahul
  Due: Friday
  Evidence 28:41

✓ Share Salesforce integration docs
  Owner: Sachin
  Due: Tomorrow
  Evidence 31:02


CUSTOMER
─────────────────────────────────

✓ Introduce security lead
  Owner: Sarah
  Due: Next week
  Evidence 29:11

⚠ No date committed
  "I'll speak with finance."
  Evidence 34:08
```

Highlight:

```text
⚠ CUSTOMER HAS NOT COMMITTED
TO A NEXT MEETING
```

### 5. Deal Killers

```text
🔴 Security review required

Customer cannot buy until security signs off.

Evidence
"We can't onboard another vendor without
security review."

────────────────────────────────

🔴 Competitor still active

Customer is evaluating AcmeAI next week.

Evidence
"We've also got a demo with Acme on Tuesday."

────────────────────────────────

🟡 No economic buyer

No budget owner participated in this call.

────────────────────────────────

🟡 No timeline

Customer expressed interest but gave no
purchase deadline.
```

Differentiator:

> risk → why → quote → timestamp → audio.

### 6. Next Call Battlecard

```text
GOAL
Get security-review process confirmed.

ASK THESE

1. Who owns the security approval?

2. What documentation do they require?

3. Can we schedule the technical review now?


BE READY FOR

💰 Pricing objection
Customer compared $800/mo with current $400/mo.

Suggested response:
Frame price against 6 hours/week currently spent
on manual routing.


DON'T FORGET

Send SOC2 docs before the meeting.
```

This changes the product from:

> “Here is what happened.”

to:

> **“Here is what you should do next.”**

### 7. Evidence-safe follow-up

Plain email generation is boring.

Make every factual sentence evidence-backed:

```text
Hi Sarah,

Thanks for the discussion today.

As discussed, I'll send over our SOC2
documentation by Friday.                         [28:41 ✓]

You mentioned that your security team will
need to review us before moving forward.         [26:04 ✓]

I'll also send the Salesforce integration
documentation tomorrow.                         [31:02 ✓]

Looking forward to reconnecting next week.       [⚠ NOT AGREED]
```

Then:

```text
⚠ UNSUPPORTED CLAIM

"Looking forward to reconnecting next week."

The customer did not explicitly agree
to another meeting.

[ Remove ]
```

This applies the invariant:

> **no proof → no claim**

to outbound communication.

### 8. Manager Brief

```text
ACME — $48K

DEAL HEALTH                  🟡 6/10

WHY THEY BUY
Manual routing costs ~6 hrs/week.

WHY THEY DON'T
• Security approval
• 2× current price
• Competitor demo Tuesday

BUYING SIGNAL
Strong product fit.

BIGGEST RISK
No economic buyer involved.

CUSTOMER COMMITMENT
⚠ Weak

NEXT MOVE
Get security lead into next call.
```

This is mostly a new view over existing JSON.

### 9. Moments that mattered

```text
00:00 ───────────────────────── 38:12

       💡       💰     ⚔️        ✅
       │        │      │         │
       Pain     Price  Competitor Next step
       08:42    19:14  24:03     34:51
```

Click → jump → play → show extraction.

### 10. Objection → Suggested response

```text
OBJECTION
"Your price is almost twice what we pay."

[ Generate response ]
```

Then use another fact from the call:

```text
HOW TO HANDLE IT NEXT TIME

Customer's actual concern:
Cost increase relative to current provider.

Suggested response:

"You mentioned you're spending roughly six
hours each week manually routing calls.
Could we quantify what that costs the team
before comparing the subscription prices?"
```

### 11. Competitor intelligence

```text
COMPETITORS MENTIONED

AcmeVoice

Customer sentiment:
🟡 Evaluating

What they like:
• Lower price

What concerns them:
• Unknown Salesforce integration

Evidence:
24:03 → 24:47
```

### 12. Ask the Call

```text
Ask this call...
```

Question:

> “Why is the customer hesitant?”

Response:

```text
Two reasons:

1. Price is nearly double their current
   provider. [21:14]

2. Security approval is mandatory.
   [26:04]

[▶ Play evidence]
```

Useful, but P2 because generic transcript chat is not very differentiated.

### Avoid fake probability

Do not show:

```text
Likelihood to close: 84%
```

Instead show observable dimensions:

```text
DEAL SIGNALS

Pain identified              ✅
Business impact quantified   ✅
Decision maker identified    ❌
Timeline identified          ❌
Competition active           ⚠
Next meeting committed       ❌
```

### Five additions to prioritize

1. Customer Truth
2. Play Evidence
3. Reality Check
4. Commitment Ledger
5. Next Call Battlecard

### Final report concept

```text
┌──────────────────────────────────────────────────────────────┐
│  ACME × SAAS LABS                            38:12           │
│                                                              │
│  DEAL SIGNALS                                                 │
│  🟢 Pain identified     🟢 Intent      🔴 Security blocker   │
│  🟡 Competition         🔴 No next meeting                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  CUSTOMER TRUTH                           TRANSCRIPT          │
│                                                              │
│  💡 PAIN                                  08:42 Sarah         │
│  Manual routing costs 6 hrs/week.  ────► "We're spending..." │
│  [▶ PLAY]                                                    │
│                                                              │
│  💰 OBJECTION                             21:14 Sarah         │
│  Price is ~2× current vendor.      ────► "We're paying..."   │
│  [▶ PLAY]                                                    │
│                                                              │
│  ⚔ COMPETITOR                             24:03 Sarah         │
│  AcmeAI demo scheduled Tuesday.    ────► "We're also..."     │
│  [▶ PLAY]                                                    │
├──────────────────────────────────────────────────────────────┤
│  ⚠ REALITY CHECK                                             │
│                                                              │
│  Rep implied: "They're ready to move ahead."                 │
│                                                              │
│  Customer actually said:                                    │
│  "We still need security approval and we're evaluating       │
│   another provider."                            [▶ PLAY]     │
├──────────────────────────────────────────────────────────────┤
│  COMMITMENTS                                                 │
│                                                              │
│  You       → SOC2 docs       Friday                   ✓      │
│  You       → API docs        Tomorrow                 ✓      │
│  Customer  → Security intro  No date                  ⚠      │
│  Customer  → Next meeting    NOT COMMITTED            🔴     │
├──────────────────────────────────────────────────────────────┤
│  ⚠ DEAL KILLERS                                              │
├──────────────────────────────────────────────────────────────┤
│  🎯 NEXT CALL                                                │
│                                                              │
│  Goal: Get security owner involved                           │
│                                                              │
│  Ask:                                                        │
│  1. Who owns security approval?                              │
│  2. What documents are required?                             │
│  3. Can we schedule technical review?                        │
│                                                              │
│            [ GENERATE SAFE FOLLOW-UP ]                       │
└──────────────────────────────────────────────────────────────┘
```

Demo story:

> Upload call → AI produces notes → “but summaries hallucinate” → click a claim → hear customer say it → show Reality Check → uncover something the salesperson missed → show next-call strategy → generate a follow-up that refuses unsupported commitment.

---

## Turn 22 — User

> now frame the architecture for these using fastapi and for UI is react and tailwind css. keeping every feature we have in gong. keep in mind we are going to use pyai only and for sentiment check if all are there in pyai else we need everything opensource (like nvidia instead of open source and also we need a blob storage and everything should be opensource)

## Turn 23 — Assistant

The proposed architecture was a durable asynchronous pipeline using:

- FastAPI
- React
- Tailwind
- PyAI Hear
- local open-source intelligence
- SeaweedFS
- PostgreSQL + pgvector
- Valkey
- Celery

It treated the feature set as:

- transcription
- speaker timeline
- summary
- objections
- intent
- sentiment
- next steps
- follow-up
- evidence receipts
- Customer Truth
- Reality Check
- Commitment Ledger
- Deal Killers
- Next-call Battlecard
- Manager Brief
- competitor intelligence
- objection coaching
- Ask-the-Call
- moments timeline
- audio evidence
- exports/share
- talk ratio
- keyword analytics

### Initial responsibility split

| Capability           | Implementation                        |
| -------------------- | ------------------------------------- |
| Audio transcription  | PyAI Hear                             |
| Speaker diarization  | PyAI Hear                             |
| Segment timestamps   | PyAI Hear                             |
| Summary              | local Qwen3                           |
| Sentiment            | local Qwen3                           |
| Buying intent        | local Qwen3                           |
| Objections           | local Qwen3                           |
| Customer Truth       | local Qwen3 + deterministic validator |
| Reality Check        | local Qwen3                           |
| Commitments          | local Qwen3                           |
| Deal Killers         | local Qwen3                           |
| Battlecard           | local Qwen3                           |
| Follow-up            | local Qwen3                           |
| Competitors          | local Qwen3                           |
| Ask-the-call         | BGE embeddings + pgvector + Qwen3     |
| Talk ratio           | Python                                |
| Evidence validation  | Python                                |
| Exact audio playback | browser timestamps                    |
| Blob                 | SeaweedFS                             |
| DB                   | PostgreSQL                            |
| Queue                | Valkey                                |
| Worker               | Celery                                |
| LLM runtime          | llama.cpp                             |

### System architecture

```text
                                  INTERNET
                                     │
                                     ▼
                           ┌──────────────────┐
                           │      Caddy       │
                           │   Reverse Proxy  │
                           └────────┬─────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌──────────────────────┐         ┌──────────────────────┐
        │      React UI        │         │      FastAPI API     │
        │                      │         │                      │
        │ React                │         │ REST API             │
        │ Tailwind             │         │ SSE events           │
        │ Audio player         │         │ Auth/share tokens    │
        │ Transcript           │         │ Upload handling      │
        │ Evidence UI          │         │ Job orchestration    │
        └──────────────────────┘         └──────────┬───────────┘
                                                   │
                         ┌─────────────────────────┼────────────────────────┐
                         │                         │                        │
                         ▼                         ▼                        ▼
                ┌────────────────┐        ┌────────────────┐      ┌────────────────┐
                │   PostgreSQL   │        │    Valkey      │      │   SeaweedFS    │
                │                │        │                │      │                │
                │ Calls          │        │ Celery broker  │      │ Raw audio      │
                │ Segments       │        │ job state      │      │ exports        │
                │ Insights       │        └───────┬────────┘      │ PyAI raw JSON  │
                │ Evidence       │                │               └────────────────┘
                │ pgvector       │                │
                └────────────────┘                ▼
                                         ┌─────────────────┐
                                         │ Celery Workers  │
                                         └────────┬────────┘
                                                  │
              ┌───────────────────────────────────┼──────────────────────────────────┐
              │                                   │                                  │
              ▼                                   ▼                                  ▼
       ┌──────────────┐                  ┌─────────────────┐               ┌──────────────────┐
       │     PyAI     │                  │  Intelligence   │               │   Embeddings     │
       │              │                  │     Engine      │               │                  │
       │ Hear         │                  │                 │               │ BGE-small       │
       │ diarization  │                  │ Qwen3-4B       │               │ sentence-       │
       │ timestamps   │                  │ llama.cpp      │               │ transformers     │
       └──────┬───────┘                  └────────┬────────┘               └────────┬─────────┘
              │                                   │                                  │
              └──────────────────────┬────────────┴──────────────────────────────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Evidence Validator   │
                          │                      │
                          │ segment IDs exist?   │
                          │ speaker correct?     │
                          │ quote supported?     │
                          │ customer-only claim? │
                          │ duplicate claim?     │
                          └──────────┬───────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │  Final Call Report   │
                          │                      │
                          │ Summary              │
                          │ Customer Truth       │
                          │ Objections           │
                          │ Commitments          │
                          │ Deal Risks           │
                          │ Reality Check        │
                          │ Battlecard           │
                          │ Manager Brief        │
                          │ Follow-up            │
                          │ Ask Call             │
                          └──────────────────────┘
```

### End-to-end processing

```text
UPLOAD
  │
  ▼
SeaweedFS
  │
  ▼
Postgres: Call created
  │
  ▼
Celery job
  │
  ▼
PyAI Hear batch transcription
  │
  ▼
Diarized transcript
  │
  ▼
Speaker-role resolution
  │
  ├──── deterministic analytics
  │
  ├──── intelligence extraction
  │
  ├──── embeddings
  │
  └──── evidence verification
          │
          ▼
     report artifacts
          │
          ▼
       SHIPPED
```

### Blob architecture

SeaweedFS buckets:

```text
opengong-audio/
opengong-results/
opengong-samples/
```

Keys:

```text
calls/
  56a831/
    original.mp3

    pyai/
      transcription.json

    exports/
      report.json
      report.md
```

The backend streams uploads and keeps binary audio out of Postgres.

### PyAI normalization

Normalize transcript output:

```json
{
  "language": "en",
  "text": "...",
  "segments": [
    {
      "id": 42,
      "speaker": "speaker_1",
      "start_ms": 841200,
      "end_ms": 846800,
      "text": "We need security approval before we can move ahead."
    }
  ]
}
```

The rest of the system must not depend on raw PyAI response shape.

### Speaker-role resolution

Diarization gives `speaker_0` and `speaker_1`, not seller/customer.

The system infers roles and allows a **Swap speakers** action.

### Structured intelligence schema

```python
class CallIntelligence(BaseModel):
    summary: Summary
    buyer_sentiment: BuyerSentiment
    buying_intent: BuyingIntent
    customer_truth: list[CustomerFact]
    objections: list[Objection]
    commitments: list[Commitment]
    risks: list[DealRisk]
    competitors: list[CompetitorMention]
    moments: list[CallMoment]
    reality_checks: list[RealityCheck]
    next_call: Battlecard
    manager_brief: ManagerBrief
```

Evidence references only segment IDs:

```python
class EvidenceRef(BaseModel):
    segment_ids: list[int]
```

The model does not generate timestamps.

### Product invariant

> **The model may infer. The evidence layer decides whether the inference ships.**

### Evidence validation

- segment exists
- same call
- correct speaker
- claim supported
- duplicate check
- use original transcript quote

### Customer Truth

Only customer segments, grouped into:

- pain
- buying signal
- requirement
- blocker
- budget
- timeline
- competition
- commitment

### Exact audio evidence

Use original recording and seek to `start_ms`; do not pre-generate clips.

### Sentiment

The first design used Qwen to output:

- overall sentiment
- trajectory
- positive and negative signals
- evidence segment IDs

It explicitly separated sentiment from buying intent.

### Other feature architecture

- Talk ratio: deterministic from timestamps
- Moments: normalized timestamped markers
- Commitment Ledger: structured commitment schema
- Reality Check: compare seller assumptions to customer commitments
- Deal Killers: supported/absence-based/unconfirmed risks
- Battlecard: generated from validated intelligence
- Evidence-safe email: sentence-level evidence
- Manager Brief: presentation-only view
- Ask-the-call: BGE + pgvector + Qwen synthesis

### PostgreSQL tables

- calls
- speakers
- transcript_segments
- analysis_runs
- insights
- evidence_links
- transcript_chunks
- processing_events
- share_links

### Celery graph

```text
process_call
    │
    ▼
transcribe
    │
    ▼
persist_segments
    │
    ├───────────────┬────────────────┐
    ▼               ▼                ▼
metrics          intelligence     embeddings
    │               │                │
    └───────────────┴────────────────┘
                    │
                    ▼
            validate_evidence
                    │
                    ▼
             build_artifacts
                    │
                    ▼
                SHIPPED
```

### Named states

- UPLOADING
- QUEUED
- TRANSCRIBING
- ANALYZING
- VALIDATING
- INDEXING
- SHIPPED
- PARTIAL
- FAILED

### Named errors

PyAI:

- PYAI_AUTH_FAILED
- PYAI_SUBMIT_FAILED
- PYAI_JOB_FAILED
- PYAI_JOB_TIMEOUT

LLM:

- LLM_TIMEOUT
- LLM_INVALID_JSON
- LLM_SCHEMA_MISMATCH
- LLM_CONTEXT_TOO_LARGE

Evidence:

- EVIDENCE_SEGMENT_MISSING
- EVIDENCE_WRONG_SPEAKER
- EVIDENCE_UNSUPPORTED_CLAIM

Storage:

- BLOB_UPLOAD_FAILED
- BLOB_NOT_FOUND
- DATABASE_WRITE_FAILED

### FastAPI endpoints

- calls
- audio
- process
- transcript
- insights
- events/SSE
- ask
- reanalyze
- share
- JSON/Markdown export

### React structure

Pages and components for:

- upload
- processing
- call report
- shared report
- audio player
- timeline
- transcript
- Customer Truth
- signals
- sentiment
- Reality Check
- Commitment Ledger
- Deal Killers
- competitors
- objections
- battlecard
- manager brief
- evidence-safe email
- Ask-the-Call

### Docker services

- web
- api
- worker
- postgres + pgvector
- valkey
- seaweedfs
- llama
- caddy

### Stack frozen at that point

```text
FRONTEND
React
Tailwind CSS
Vite

BACKEND
Python
FastAPI
Pydantic
SQLAlchemy
Alembic

ASYNC
Celery
Valkey

DATA
PostgreSQL
pgvector

BLOB
SeaweedFS

AI / SPEECH
PyAI Hear
PyAI Speak only for synthetic/sample calls

OPEN-SOURCE INTELLIGENCE
Qwen3-4B-Instruct
llama.cpp

SEARCH
BAAI/bge-small-en-v1.5
pgvector

DEPLOYMENT
Docker Compose
Caddy
```

### Critical implementation order

```text
Upload
  ↓
SeaweedFS
  ↓
PyAI Hear
  ↓
segments
  ↓
Postgres
  ↓
structured analysis
  ↓
evidence validation
  ↓
Customer Truth + Objections
  ↓
click insight
  ↓
transcript jumps
  ↓
actual audio plays
```

---

## Turn 24 — User

> we need to host it also. so local qwen and everything is not eligible. it should be oss but hostible as we need to demo it. also our system is not that strong to run qwen fast. we need to find oss alternative which is hosted and have best result example - roberta go emotion model or even something even better

## Turn 25 — Assistant

The architecture should change again.

The mistake would be to replace OpenAI/Anthropic with **a local 4B model** and then discover during the demo that the laptop takes 40 seconds per analysis. A general-purpose LLM is not required for most product features.

The better design is:

> **PyAI for speech → small OSS specialist models deployed as services → deterministic rules/evidence → lightweight generative model only where text generation is actually necessary.**

### Recommended hosted model stack

| Requirement                        | Model                                | Why                                      |
| ---------------------------------- | ------------------------------------ | ---------------------------------------- |
| STT + diarization                  | **PyAI Hear**                        | Core required PyAI usage                 |
| Emotions                           | **SamLowe/roberta-base-go_emotions** | 28 emotions + neutral, MIT               |
| Sales classifications              | **ModernBERT-base-zeroshot-v2.0**    | Arbitrary labels, Apache-2.0, small ONNX |
| Higher-accuracy fallback           | **DeBERTa-v3-base-zeroshot-v2.0-c**  | Better accuracy, heavier                 |
| Embeddings/search                  | **BAAI/bge-small-en-v1.5**           | 33.4M params, MIT                        |
| Generation/summarization           | **FLAN-T5-small** initially          | ~308 MB weights, Apache-2.0              |
| Better generation if server allows | **FLAN-T5-base**                     | Better quality, ~990 MB weights          |
| Runtime                            | **ONNX Runtime**                     | CPU-oriented, MIT                        |
| Blob                               | **SeaweedFS**                        | OSS S3-compatible                        |
| DB                                 | PostgreSQL + pgvector                | OSS                                      |
| Queue                              | Valkey                               | OSS                                      |
| Backend                            | FastAPI + Celery                     | OSS                                      |
| UI                                 | React + Tailwind                     | OSS                                      |

ModernBERT zero-shot was selected for the hackathon because the INT8 ONNX checkpoint is compact and CPU-friendly.

### GoEmotions is not deal sentiment

Example:

> “This is impressive, but there's no chance we have budget this quarter.”

Emotion:

```text
admiration / positive
```

Commercial interpretation:

```text
buying intent → low
budget blocker → true
deal signal → negative
```

Run two analyses:

#### Emotion

GoEmotions:

```text
admiration       0.72
optimism         0.18
neutral          0.08
disappointment   0.02
```

#### Commercial intent

ModernBERT zero-shot:

```text
strong buying signal        0.12
pricing objection           0.91
budget blocker              0.95
security blocker            0.04
competitor evaluation       0.08
```

### Specialist pipeline

For:

> “I like the product, but $900 is almost twice what we're paying today.”

Run:

```text
                           CUSTOMER SEGMENT
                                  │
                 ┌────────────────┼──────────────────┐
                 │                │                  │
                 ▼                ▼                  ▼
            GoEmotions       ModernBERT          Rules
                 │           zero-shot              │
                 │                │                  │
           admiration       pricing objection      "$900"
           optimism         price sensitivity      money entity
                 │                │                  │
                 └────────────────┼──────────────────┘
                                  ▼
                         NORMALIZED INSIGHT
```

Result:

```json
{
  "type": "pricing_objection",
  "severity": "high",
  "sentiment": "mixed",
  "emotions": ["admiration", "concern"],
  "segment_id": 83
}
```

Because the segment ID comes directly from PyAI, evidence playback is automatic.

### ModernBERT label set

```text
pain point

positive buying signal

negative buying signal

pricing objection

security blocker

technical blocker

budget blocker

competitor mention

competitor preference

decision maker identified

economic buyer identified

purchase timeline

next meeting commitment

customer commitment

seller commitment

feature requirement

integration requirement

out-of-scope request

customer question

customer concern

customer praise
```

### Revised architecture

```text
                           ┌────────────────────┐
                           │     REACT UI       │
                           │    + Tailwind      │
                           └─────────┬──────────┘
                                     │
                                REST + SSE
                                     │
                           ┌─────────▼──────────┐
                           │      FastAPI       │
                           │                    │
                           │ Calls API          │
                           │ Insights API       │
                           │ Ask API            │
                           │ Share API          │
                           └─────────┬──────────┘
                                     │
                              enqueue jobs
                                     │
                              ┌──────▼───────┐
                              │    Valkey    │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │Celery Worker │
                              └──────┬───────┘
                                     │
            ┌────────────────────────┼──────────────────────────┐
            │                        │                          │
            ▼                        ▼                          ▼
        PyAI Hear             OSS ML Service               SeaweedFS
                              FastAPI/ONNX                      │
            │                        │                          │
      diarized transcript     ┌─────┼──────────────┐       raw audio
            │                 │     │              │       exports
            ▼                 ▼     ▼              ▼
       segments          ModernBERT GoEmotions   BGE-small
       timestamps            │        │             │
       speakers              │        │             │
            │                │        │             │
            └─────────────┬──┴────────┴─────────────┘
                          │
                          ▼
                 Intelligence Engine
                          │
            ┌─────────────┼─────────────────────────────┐
            │             │                             │
            ▼             ▼                             ▼
         Rules       Evidence validator          FLAN-T5 service
            │             │                      only when needed
            └─────────────┼─────────────────────────────┘
                          │
                          ▼
                     PostgreSQL
                          │
                          ▼
                      React UI
```

There is no Qwen/llama.cpp in this revised architecture.

### Separate ML service

```text
services/
└── ml/
    ├── app.py
    ├── models/
    │   ├── emotions.py
    │   ├── classifier.py
    │   ├── embeddings.py
    │   └── generator.py
    ├── schemas/
    └── Dockerfile
```

Endpoints:

```text
POST /classify
POST /emotion
POST /embed
POST /generate
```

Models load once at boot.

### ONNX runtime

Use ONNX Runtime rather than full PyTorch where possible:

```text
ModernBERT INT8 ONNX
        ↓
ONNX Runtime

GoEmotions INT8 ONNX
        ↓
ONNX Runtime
```

This makes CPU hosting practical.

### Feature implementation under this stack

#### Transcript

```text
Audio
 ↓
PyAI Hear
 ↓
speaker + start + end + text
```

#### Customer Truth

Only `role == CUSTOMER` segments.

ModernBERT detects:

- pain
- requirement
- blocker
- buying signal
- timeline
- commitment

No generative model required.

#### Sentiment

GoEmotions + ModernBERT sales signals.

Aggregate over time:

```text
0 min                  35 min

😐 ─────🙂──────😕──────🙂──────😐
       ↑       ↑       ↑
   interest  pricing  product fit
```

#### Objections

Zero-shot labels:

- pricing
- security
- integration
- technical
- budget
- timing
- competition

#### Deal Killers

Deterministic rules:

```python
if security_blocker.score > .75:
    add_risk("Security approval required")

if competitor_active and buying_intent < .5:
    add_risk("Active competitor evaluation")

if not customer_next_step:
    add_risk("No customer commitment")

if not timeline_signal:
    add_risk("No purchase timeline")
```

#### Commitment Ledger

Use customer/seller commitment labels plus speaker/timestamp.

#### Competitor Intelligence

Use tracked-term matching, organization candidates and zero-shot competitor labels.

#### Reality Check

Compare seller confidence language with customer blockers/commitments using NLI-style classification.

#### Manager Brief

Template existing validated fields; no model call.

#### Next-call Battlecard

Template from missing signals and top blockers.

#### Evidence-safe email

Template-based first.

Optional `Polish wording` uses FLAN-T5.

If generation fails, core output still works.

### FLAN-T5 role

Use only for:

- summary prose
- email polishing
- battlecard wording
- short Ask-the-Call synthesis

Not extraction.

Start with:

```text
google/flan-t5-small
```

Make it swappable to `flan-t5-base`.

### Ask-the-Call

Use `BAAI/bge-small-en-v1.5` + pgvector.

Question retrieves evidence chunks first.

Generation is optional.

A retrieval-only answer is valid:

```text
I found 3 relevant moments:

1. Security approval required          26:04
2. Pricing nearly double current cost  21:14
3. Competitor demo scheduled           24:03

[▶ Play each]
```

### Lightweight deployment

Instead of a 4B LLM:

```text
ml-service

ModernBERT INT8       ~151 MB
GoEmotions INT8       small classifier
BGE-small             33M params
FLAN-T5-small         ~308 MB

CPU
```

### Deployment architecture

```text
                    Docker host / VM
                           │
        ┌──────────────────┼─────────────────┐
        │                  │                 │
        ▼                  ▼                 ▼
     React              FastAPI          Worker
     Nginx                                Celery
                           │                 │
                           └───────┬─────────┘
                                   │
       ┌────────────┬──────────────┼────────────┐
       ▼            ▼              ▼            ▼
   PostgreSQL     Valkey       SeaweedFS    ML Service
                                            │
                                      ONNX Runtime
                                            │
                                  ┌─────────┼─────────┐
                                  ▼         ▼         ▼
                              ModernBERT GoEmotion   BGE
                                            │
                                         FLAN-T5
                                   optional generation

                    Worker
                       │
                       │ internet
                       ▼
                     PyAI
                       │
                      Hear
```

### Final model stack proposed

```text
SPEECH
PyAI Hear

EMOTION
SamLowe/roberta-base-go_emotions

SALES SEMANTICS
MoritzLaurer/ModernBERT-base-zeroshot-v2.0
ONNX INT8

EMBEDDINGS
BAAI/bge-small-en-v1.5

GENERATION
google/flan-t5-small

INFERENCE
ONNX Runtime
```

Generation remains non-critical.

---
