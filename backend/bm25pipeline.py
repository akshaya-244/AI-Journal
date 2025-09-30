import math
import re
from collections import Counter
from typing import List, Dict, Any, Tuple
import numpy as np

def _simple_tokenize(text: str) -> List[str]:
    # lowercase + split on non-word characters; tweak if you want stemming, etc.
    return [t for t in re.split(r"\W+", text.lower()) if t]

class BM25:
    """
    Okapi BM25 for keyword/lexical search.
    - k1: term-frequency saturation (1.2–2.0 common)
    - b : document-length normalization (0=no norm, 1=full norm; 0.75 common)
    """
    def __init__(self, k1: float = 1.5, b: float = 0.75, tokenizer=_simple_tokenize):
        self.k1 = k1
        self.b = b
        self.tokenize = tokenizer

        # learned state
        self.N = 0
        self.avgdl = 0.0
        self.doc_lens: List[int] = []
        self.doc_tfs: List[Counter] = []
        self.idf: Dict[str, float] = {}
        self.vocab_df: Counter = Counter()

    def fit(self, corpus: List[str]) -> None:
        """
        Build BM25 stats from a list of documents (strings).
        """
        self.N = len(corpus)
        if self.N == 0:
            # nothing to index
            self.avgdl = 0.0
            self.doc_lens = []
            self.doc_tfs = []
            self.idf = {}
            self.vocab_df = Counter()
            return

        self.doc_tfs = []
        self.doc_lens = []
        self.vocab_df = Counter()

        # per-doc term frequencies and document frequencies
        for doc in corpus:
            tokens = self.tokenize(doc)
            tf = Counter(tokens)
            self.doc_tfs.append(tf)
            self.doc_lens.append(len(tokens))
            # add unique terms in this doc to DF
            self.vocab_df.update(set(tokens))

        self.avgdl = (sum(self.doc_lens) / self.N) if self.N > 0 else 0.0

        # IDF per term (classic BM25 form). Add small epsilon guard against division by zero.
        eps = 1e-9
        self.idf = {
            term: math.log((self.N - df + 0.5) / (df + 0.5 + eps))
            for term, df in self.vocab_df.items()
        }

    def _score_doc(self, q_tokens: List[str], doc_idx: int) -> float:
        if self.N == 0 or self.avgdl == 0:
            return 0.0
        tf = self.doc_tfs[doc_idx]
        dl = self.doc_lens[doc_idx]
        K = self.k1 * (1 - self.b + self.b * (dl / self.avgdl))
        score = 0.0
        for t in q_tokens:
            tf_t = tf.get(t, 0)
            if tf_t == 0:
                continue
            idf_t = self.idf.get(t, 0.0)
            # BM25 term contribution
            score += idf_t * ((tf_t * (self.k1 + 1)) / (tf_t + K))
        return score

    def score(self, query: str) -> List[float]:
        """
        Return BM25 scores for all documents for the given query.
        """
        q_tokens = self.tokenize(query)
        if not q_tokens or self.N == 0:
            return [0.0] * self.N
        return [self._score_doc(q_tokens, i) for i in range(self.N)]

    def search(self, query: str, top_k: int = 5) -> Tuple[List[int], List[float]]:
        """
        Return (indices, scores) for the top_k docs.
        """
        scores = self.score(query)
        if not scores:
            return [], []
        idx = np.argsort(scores)[::-1][:top_k]
        return idx.tolist(), [scores[i] for i in idx]
