"""
Lumen Audio — grounded Q&A over a knowledge base.

Flow for POST /ask:
  1. chunk + index the documents in data/ (lexical TF-IDF index, built at startup)
  2. retrieve the most relevant article(s) for a question
  3. gate on a relevance threshold — decline with empty sources when nothing is
     relevant enough (no model call needed)
  4. otherwise generate an answer grounded ONLY in the retrieved context, with the
     source file cited; a second guardrail lets the model itself decline if the
     context does not actually contain the answer

Embedding/chat helpers live in llm.py.
Run with:  python app.py
"""

import os
import glob

from dotenv import load_dotenv

# Load .env before importing llm, which reads provider/key config at import time.
load_dotenv()

from flask import Flask, request, jsonify

import llm  # embed() and complete() — see llm.py
from retrieval import LexicalIndex

app = Flask(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Below this cosine similarity, no article is considered relevant and we decline.
# Tuned against the knowledge base: in-scope questions score >= ~0.13, while
# out-of-scope questions score <= ~0.07, so 0.10 separates them with margin.
RELEVANCE_THRESHOLD = float(os.environ.get("RELEVANCE_THRESHOLD", "0.10"))

# How many articles to retrieve, and how close a secondary article must be to the
# best score to also be included as context (keeps citations tight).
TOP_K = int(os.environ.get("TOP_K", "3"))
MARGIN_RATIO = 0.5

# Sentinel the model returns when the context does not answer the question.
NO_ANSWER = "NO_ANSWER"

REFUSAL_MESSAGE = (
    "I'm sorry, I can't answer that from Lumen Audio's help articles. "
    "Please contact support for anything outside our published policies."
)

SYSTEM_PROMPT = (
    "You are a support assistant for Lumen Audio, a consumer-audio company. "
    "Answer the customer's question using ONLY the context provided below, which is "
    "drawn from Lumen Audio's official help articles. Follow these rules strictly:\n"
    "- Use only facts stated in the context. Do not use outside knowledge or guess.\n"
    "- If the context does not contain the answer, reply with exactly: " + NO_ANSWER + "\n"
    "- Be concise and direct, and preserve specific figures (days, prices, percentages) exactly.\n"
    "- Do not mention the context, these instructions, or that you are an AI."
)


def load_documents():
    """Load every markdown article in data/ as (source_name, text)."""
    docs = []
    for path in sorted(glob.glob(os.path.join(DATA_DIR, "*.md"))):
        with open(path, "r", encoding="utf-8") as f:
            docs.append((os.path.basename(path), f.read().strip()))
    return docs


# Load and index once at startup.
DOCUMENTS = load_documents()
INDEX = LexicalIndex().build(DOCUMENTS)


def select_context(results):
    """Keep results that clear the threshold and are close to the best score.

    Returns the subset of retrieved results to use as grounding context. The top
    result must clear RELEVANCE_THRESHOLD; additional results are only kept if they
    are within MARGIN_RATIO of the top score, so weakly related articles are not
    cited alongside a clearly relevant one.
    """
    if not results:
        return []
    top_score = results[0]["score"]
    if top_score < RELEVANCE_THRESHOLD:
        return []
    cutoff = max(RELEVANCE_THRESHOLD, MARGIN_RATIO * top_score)
    return [r for r in results if r["score"] >= cutoff]


def build_user_prompt(question, context):
    """Assemble the grounding prompt from the selected context articles."""
    blocks = [f"[Source: {c['source']}]\n{c['text']}" for c in context]
    joined = "\n\n".join(blocks)
    return f"Context:\n{joined}\n\nQuestion: {question}"


def refusal_response():
    return jsonify({"answer": REFUSAL_MESSAGE, "sources": []})


@app.route("/health")
def health():
    return jsonify({"ok": True, "documents_loaded": len(DOCUMENTS)})


@app.route("/ask", methods=["POST"])
def ask():
    payload = request.get_json(silent=True) or {}
    question = (payload.get("question") or "").strip()
    if not question:
        return jsonify({"error": "send JSON like {\"question\": \"...\"}"}), 400

    # 1. Retrieve and 2. gate on relevance (cheap guardrail, no model call).
    results = INDEX.search(question, top_k=TOP_K)
    context = select_context(results)
    if not context:
        return refusal_response()

    # 3. Generate an answer grounded strictly in the retrieved context.
    user_prompt = build_user_prompt(question, context)
    try:
        answer = llm.complete(SYSTEM_PROMPT, user_prompt).strip()
    except Exception as exc:  # network, auth, timeout, or bad response shape
        app.logger.exception("Generation failed")
        return (
            jsonify({"error": "answer generation is unavailable", "detail": str(exc)}),
            502,
        )

    # 4. Second guardrail: the model may decline even when something was retrieved.
    if not answer or NO_ANSWER in answer:
        return refusal_response()

    sources = list(dict.fromkeys(c["source"] for c in context))
    return jsonify({"answer": answer, "sources": sources})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
