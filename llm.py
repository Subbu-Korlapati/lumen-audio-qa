"""
Thin LLM wrapper used by app.py.

Use your own model and key — there's nothing to request from us. Config is read from
environment variables you set in your local .env (copy .env.example):
    LLM_PROVIDER    "anthropic" or "openai" (default: openai)
    LLM_API_BASE    e.g. https://api.anthropic.com  or  https://api.openai.com/v1
    LLM_API_KEY     your API key
    LLM_CHAT_MODEL  e.g. claude-sonnet-4-6  or  gpt-4o-mini
    LLM_EMBED_MODEL e.g. text-embedding-3-small  (OpenAI only; unused by this app)

This app uses lexical retrieval, so it does NOT call embed() — only complete().
Both an OpenAI-compatible Chat Completions API and Anthropic's Messages API are
supported; the shapes differ, so complete() branches on LLM_PROVIDER.
"""

import os
import requests

PROVIDER = os.environ.get("LLM_PROVIDER", "openai").strip().lower()
API_KEY = os.environ.get("LLM_API_KEY", "")
EMBED_MODEL = os.environ.get("LLM_EMBED_MODEL", "text-embedding-3-small")

if PROVIDER == "anthropic":
    API_BASE = os.environ.get("LLM_API_BASE", "https://api.anthropic.com")
    CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL", "claude-sonnet-4-6")
else:
    API_BASE = os.environ.get("LLM_API_BASE", "https://api.openai.com/v1")
    CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL", "gpt-4o-mini")

# Cap on generated tokens; grounded support answers are short.
MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "512"))

_OPENAI_HEADERS = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
_ANTHROPIC_HEADERS = {
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
}


def embed(texts):
    """Return a list of embedding vectors, one per input string (OpenAI only).

    This app uses lexical retrieval and does not call this; Anthropic offers no
    embeddings endpoint. Kept for the OpenAI path and future use.
    """
    if PROVIDER == "anthropic":
        raise NotImplementedError(
            "Anthropic has no embeddings endpoint; this app uses lexical retrieval."
        )
    resp = requests.post(
        f"{API_BASE}/embeddings",
        headers=_OPENAI_HEADERS,
        json={"model": EMBED_MODEL, "input": texts},
        timeout=30,
    )
    resp.raise_for_status()
    return [item["embedding"] for item in resp.json()["data"]]


def complete(system, user):
    """Return the model's text reply to a system + user prompt."""
    if PROVIDER == "anthropic":
        return _complete_anthropic(system, user)
    return _complete_openai(system, user)


def _complete_openai(system, user):
    resp = requests.post(
        f"{API_BASE}/chat/completions",
        headers=_OPENAI_HEADERS,
        json={
            "model": CHAT_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "max_tokens": MAX_TOKENS,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def _complete_anthropic(system, user):
    resp = requests.post(
        f"{API_BASE}/v1/messages",
        headers=_ANTHROPIC_HEADERS,
        json={
            "model": CHAT_MODEL,
            "max_tokens": MAX_TOKENS,
            "temperature": 0,
            "system": system,
            "messages": [{"role": "user", "content": user}],
        },
        timeout=60,
    )
    resp.raise_for_status()
    blocks = resp.json().get("content", [])
    return "".join(b.get("text", "") for b in blocks if b.get("type") == "text")
