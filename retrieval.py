"""
Lexical retrieval over the knowledge base.

Given the knowledge base is six short, keyword-rich policy articles, a lightweight
TF-IDF + cosine similarity index is the right-sized choice: it needs no external
service, builds deterministically, is fully testable offline, and is more than
accurate enough at this scale. The public surface (`LexicalIndex.build` and
`LexicalIndex.search`) is deliberately small so a semantic/embedding backend could
be swapped in later behind the same interface.
"""

import math
import re
from collections import Counter

import numpy as np

_TOKEN_RE = re.compile(r"[a-z0-9]+")

# Common question/filler words carry no topical signal. Removing them keeps the
# similarity score focused on domain terms, which sharpens the refusal guardrail.
_STOPWORDS = frozenset(
    """
    a an and or the of to for in on at by as is are be was were will would can
    could should do does did have has had how what when where which who whom why
    my me we you your our us it its this that these those i if then than there
    with without into out over under about after before between not no yes any
    some such per get got getting want need please tell know
    """.split()
)


def normalise(token):
    """Lowercase-safe token normaliser with light plural folding.

    Folding a single trailing 's' (for tokens longer than three characters) lets
    'returns'/'return' and 'refunds'/'refund' match without a heavy stemmer. It is
    applied consistently to documents and queries, so exact matches are unaffected.
    """
    if len(token) > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text):
    """Split text into normalised, meaningful terms."""
    return [
        normalise(tok)
        for tok in _TOKEN_RE.findall(text.lower())
        if tok not in _STOPWORDS
    ]


class LexicalIndex:
    """In-memory TF-IDF index over (source_name, text) documents."""

    def __init__(self):
        self.sources = []            # source filename per document
        self.texts = []              # raw text per document
        self.vocab = {}              # term -> column index
        self.idf = None              # idf weight per vocab term
        self._doc_matrix = None      # L2-normalised tf-idf rows, one per document
        self._oov_idf = 0.0          # idf assigned to terms unseen in the corpus

    def build(self, documents):
        """Build the index from a list of (source_name, text) tuples."""
        self.sources = [src for src, _ in documents]
        self.texts = [text for _, text in documents]

        tokenised = [tokenize(text) for text in self.texts]
        num_docs = len(tokenised)

        vocab_terms = sorted({term for doc in tokenised for term in doc})
        self.vocab = {term: i for i, term in enumerate(vocab_terms)}

        # Smoothed idf so no term is ever zeroed out; unseen query terms get the
        # maximum possible idf so out-of-vocabulary questions are penalised.
        doc_freq = Counter(term for doc in tokenised for term in set(doc))
        self.idf = np.zeros(len(self.vocab), dtype=np.float64)
        for term, col in self.vocab.items():
            self.idf[col] = math.log((1 + num_docs) / (1 + doc_freq[term])) + 1.0
        self._oov_idf = math.log(1 + num_docs) + 1.0

        matrix = np.zeros((num_docs, len(self.vocab)), dtype=np.float64)
        for row, doc in enumerate(tokenised):
            for term, count in Counter(doc).items():
                matrix[row, self.vocab[term]] = count * self.idf[self.vocab[term]]
        self._doc_matrix = self._l2_normalise_rows(matrix)
        return self

    @staticmethod
    def _l2_normalise_rows(matrix):
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        return matrix / norms

    def _query_vector(self, question):
        """Build an L2-normalised tf-idf vector for the question.

        Out-of-vocabulary terms do not exist as columns, but their weight is folded
        into the query norm. This lowers the cosine score of questions dominated by
        unknown words, which is exactly the behaviour the refusal guardrail wants.
        """
        counts = Counter(tokenize(question))
        vec = np.zeros(len(self.vocab), dtype=np.float64)
        norm_sq = 0.0
        for term, count in counts.items():
            if term in self.vocab:
                weight = count * self.idf[self.vocab[term]]
                vec[self.vocab[term]] = weight
            else:
                weight = count * self._oov_idf
            norm_sq += weight * weight
        norm = math.sqrt(norm_sq)
        if norm > 0:
            vec = vec / norm
        return vec

    def search(self, question, top_k=3):
        """Return up to `top_k` results as dicts sorted by descending score.

        Each result: {"source": str, "score": float, "text": str}.
        Scores are cosine similarities in [0, 1].
        """
        if self._doc_matrix is None:
            raise RuntimeError("Index has not been built; call build() first.")

        query_vec = self._query_vector(question)
        if not np.any(query_vec):
            return []

        scores = self._doc_matrix @ query_vec
        order = np.argsort(scores)[::-1][:top_k]
        return [
            {
                "source": self.sources[i],
                "score": float(scores[i]),
                "text": self.texts[i],
            }
            for i in order
            if scores[i] > 0
        ]
