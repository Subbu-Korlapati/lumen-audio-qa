# Decisions

A short, honest record of how you approached this. Bullet points are fine — this doesn't
need to be long, it needs to be real. It's the backbone of our conversation.

## Assumptions

*The brief is deliberately under-specified. What did you assume, and why?
(e.g. who the user is, what "grounded" should mean, how strict the refusal should be.)*

The brief is deliberately under-specified. What I assumed, and why:

- **User & tone.** The consumer is a Lumen Audio customer asking policy questions
  (returns, shipping, warranty, faulty items, account/data, order changes). Answers
  should be concise, factual, and preserve exact figures (days, prices).
- **"Grounded" means strictly extractive.** The answer must come only from the
  retrieved article text — no outside knowledge, no inference beyond what is written.
  The cited `sources` are the article file(s) that context came from.
- **Refusal should err on the side of caution.** If retrieval finds nothing clearly
  relevant, decline with an empty `sources` list rather than risk a wrong or blended
  answer. A slightly over-cautious refusal is safer than a confident hallucination
  for a support use case.
- **The knowledge base is tiny and stable** (six short, single-topic articles), which
  is the main driver of the design choices below.

## What I built and prioritised

*What did you build first, and what does the working slice do?*

A single Flask service implementing retrieval-augmented generation with a two-layer
guardrail, matching the response contract `{ "answer", "sources" }`.

- **`retrieval.py` — lexical TF-IDF index (in memory).** Each article is indexed as
  one unit (they are one short paragraph each). Cosine similarity ranks articles for
  a question. Chosen over embeddings because it needs no API key, builds
  deterministically, is fully testable offline, and is more than accurate enough at
  this scale. Light plural folding and stop-word removal sharpen the signal.
- **`app.py` — `/ask` pipeline:** validate input → retrieve top-k → **relevance-
  threshold gate** → grounded generation → **model-level decline** → assemble sources.
- **Two-layer refusal guardrail** (the behaviour the brief tests hardest):
  1. A cosine threshold (default `0.10`) declines out-of-scope questions cheaply,
     with no model call. It was tuned against the KB: in-scope questions score
     `>= ~0.13`, out-of-scope `<= ~0.07`, so `0.10` separates them with margin.
  2. The grounding prompt permits the model to return `NO_ANSWER` when the retrieved
     context doesn't actually contain the answer; that maps to a refusal with empty
     `sources`. This catches borderline cases the threshold lets through.
- **Robust, honest failure modes:** empty/invalid input → `400`; provider auth /
  network / timeout errors → clean `502` JSON (never a stack trace, never a guessed
  answer). Verified: with no key set, in-scope questions return `502` and out-of-scope
  questions still correctly refuse.
- **Tight citations:** secondary articles are only cited if their score is within
  half of the top score, so a clearly-relevant single source isn't padded with
  weakly-related ones.

## What I cut, and why

*What did you consciously leave out given the ~2-hour timebox?*

Given the ~2-hour timebox, I deliberately left out:

- **Embeddings / a vector store.** Semantic retrieval and infrastructure (FAISS,
  pgvector, etc.) would be over-engineering for six short paragraphs and harder to
  defend as "right-sized." The retrieval interface is small, so this can be swapped
  in later without touching the endpoint.
- **Sub-document chunking.** Each article is already a single coherent topic.
- **Conversation memory / multi-turn** — the contract is single-shot Q&A.
- **A test suite / CI.** I verified behaviour manually against the response contract
  and the provided smoke test instead.
- **Streaming, auth, rate limiting, and caching** — not needed for the slice.

## How I'd know it works

*How would you evaluate this — beyond "it ran"? What would you measure?*

Beyond "it ran," I'd measure:

- **Guardrail accuracy (the key metric):** a labelled set of in-scope vs. out-of-scope
  questions, tracking refusal precision/recall — i.e. how often it wrongly answers an
  out-of-scope question (leak) vs. wrongly refuses a covered one (over-refusal).
- **Retrieval quality:** does the correct article rank first? (Recall@1 / MRR.) I spot-
  checked all six topics plus adjacent-topic traps (refunds vs. faulty-item shipping,
  warranty vs. faulty waterproof) — each returned the correct top source.
- **Answer faithfulness:** does every claim in the answer trace back to the cited
  source? This is best checked with a small graded set (human or model-graded).
- **Regression safety:** freeze the above as a small eval that runs on each change,
  since the threshold and prompt are the most sensitive parts.

## With more time / to take it to production

*What are the next things you'd do, and what would change to run this for real
(multiple clients, real volume, reliability, cost)?*

- **Retrieval:** add an embedding backend behind the existing interface, and consider
  hybrid (lexical + semantic) scoring for paraphrase-heavy questions.
- **Multiple clients / real volume:** move the KB and index out of process into a
  shared vector store with per-client namespacing; version and rebuild indexes on KB
  changes; run behind a production WSGI server (gunicorn) with health/readiness probes.
- **Reliability:** retries with backoff and circuit-breaking around the model provider,
  request timeouts, structured logging and tracing, and graceful degradation.
- **Cost/latency:** cache embeddings and frequent answers, batch where possible, and
  right-size the model per query.
- **Quality loop:** log questions, retrieved sources, and answers (with consent) to
  build the real eval set, and calibrate the threshold from data rather than by hand.
- **Safety:** stricter answer-faithfulness checks and optional citation-span
  highlighting so the support team can verify at a glance.
