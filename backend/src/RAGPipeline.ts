/**
 * RAG Pipeline for Journal Logs - TypeScript implementation for Cloudflare Workers
 * This provides semantic search, keyword search, and hybrid search capabilities
 */

export interface JournalEntry {
  date: string;
  day: string;
  text: string;
  timestamp?: string;
}

export interface SearchResult extends JournalEntry {
  similarity_score?: number;
  keyword_score?: number;
  hybrid_score?: number;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
}

export class RAGPipeline {
  private journalLogs: JournalEntry[] = [];
  
  constructor(journalLogs: JournalEntry[]) {
    this.journalLogs = journalLogs;
  }

  /**
   * Simple tokenization function
   */
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out short words
  }

  /**
   * Calculate TF-IDF scores for a document
   */
  private calculateTFIDF(documents: string[]): { [term: string]: { [docIndex: number]: number } } {
    const tf: { [term: string]: { [docIndex: number]: number } } = {};
    const idf: { [term: string]: number } = {};
    const docCount = documents.length;

    // Calculate term frequency (TF)
    documents.forEach((doc, docIndex) => {
      const tokens = this.tokenize(doc);
      const termCount: { [term: string]: number } = {};
      
      tokens.forEach(token => {
        termCount[token] = (termCount[token] || 0) + 1;
      });

      tokens.forEach(token => {
        if (!tf[token]) tf[token] = {};
        tf[token][docIndex] = termCount[token] / tokens.length;
      });
    });

    // Calculate inverse document frequency (IDF)
    Object.keys(tf).forEach(term => {
      const docFrequency = Object.keys(tf[term]).length;
      idf[term] = Math.log(docCount / docFrequency);
    });

    return tf;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Enhanced semantic search using TF-IDF and text similarity
   */
  async performSemanticSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (this.journalLogs.length === 0) return [];

    const documents = this.journalLogs.map(entry => entry.text);
    const queryTokens = this.tokenize(query);
    
    // Create vocabulary from all documents and query
    const allTokens = new Set<string>();
    documents.forEach(doc => {
      this.tokenize(doc).forEach(token => allTokens.add(token));
    });
    queryTokens.forEach(token => allTokens.add(token));
    
    const vocabulary = Array.from(allTokens);
    
    // Calculate TF-IDF for documents
    const tfidf = this.calculateTFIDF(documents);
    
    // Create document vectors
    const docVectors: number[][] = [];
    documents.forEach((_, docIndex) => {
      const vector: number[] = [];
      vocabulary.forEach(term => {
        const tf = tfidf[term]?.[docIndex] || 0;
        const idf = Math.log(documents.length / (Object.keys(tfidf[term] || {}).length + 1));
        vector.push(tf * idf);
      });
      docVectors.push(vector);
    });
    
    // Create query vector
    const queryTermCount: { [term: string]: number } = {};
    queryTokens.forEach(token => {
      queryTermCount[token] = (queryTermCount[token] || 0) + 1;
    });
    
    const queryVector: number[] = [];
    vocabulary.forEach(term => {
      const tf = (queryTermCount[term] || 0) / queryTokens.length;
      const idf = Math.log(documents.length / (Object.keys(tfidf[term] || {}).length + 1));
      queryVector.push(tf * idf);
    });
    
    // Calculate similarities
    const similarities = docVectors.map((docVector, index) => ({
      index,
      similarity: this.cosineSimilarity(queryVector, docVector)
    }));
    
    // Sort by similarity and return top results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(({ index, similarity }) => ({
        ...this.journalLogs[index],
        similarity_score: similarity
      }));
  }

  /**
   * Keyword search using simple text matching
   */
  async performKeywordSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (this.journalLogs.length === 0) return [];

    const queryWords = this.tokenize(query);
    
    const scoredResults = this.journalLogs.map(entry => {
      const text = entry.text.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        const matches = (text.match(new RegExp(word, 'g')) || []).length;
        score += matches;
        
        // Bonus for exact phrase match
        if (text.includes(query.toLowerCase())) {
          score += queryWords.length;
        }
      });
      
      return {
        ...entry,
        keyword_score: score
      };
    });
    
    return scoredResults
      .filter(result => result.keyword_score > 0)
      .sort((a, b) => b.keyword_score - a.keyword_score)
      .slice(0, topK);
  }

  /**
   * BM25-like keyword search implementation
   */
  async performBM25Search(query: string, topK: number = 5): Promise<SearchResult[]> {
    if (this.journalLogs.length === 0) return [];

    const k1 = 1.5;
    const b = 0.75;
    const queryTerms = this.tokenize(query);
    
    // Calculate average document length
    const docLengths = this.journalLogs.map(entry => this.tokenize(entry.text).length);
    const avgDocLength = docLengths.reduce((sum, len) => sum + len, 0) / docLengths.length;
    
    // Calculate IDF for query terms
    const docCount = this.journalLogs.length;
    const idf: { [term: string]: number } = {};
    
    queryTerms.forEach(term => {
      const docFrequency = this.journalLogs.filter(entry => 
        this.tokenize(entry.text).includes(term)
      ).length;
      idf[term] = Math.log((docCount - docFrequency + 0.5) / (docFrequency + 0.5));
    });
    
    // Calculate BM25 scores
    const scores = this.journalLogs.map((entry, index) => {
      const tokens = this.tokenize(entry.text);
      const docLength = tokens.length;
      const termFreqs: { [term: string]: number } = {};
      
      tokens.forEach(token => {
        termFreqs[token] = (termFreqs[token] || 0) + 1;
      });
      
      let score = 0;
      queryTerms.forEach(term => {
        const tf = termFreqs[term] || 0;
        if (tf > 0) {
          const K = k1 * (1 - b + b * (docLength / avgDocLength));
          score += idf[term] * ((tf * (k1 + 1)) / (tf + K));
        }
      });
      
      return {
        ...entry,
        bm25_score: score
      };
    });
    
    return scores
      .filter(result => result.bm25_score > 0)
      .sort((a, b) => b.bm25_score - a.bm25_score)
      .slice(0, topK);
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async performHybridSearch(query: string, topK: number = 5, alpha: number = 0.5): Promise<SearchResult[]> {
    const [semanticResults, keywordResults] = await Promise.all([
      this.performSemanticSearch(query, topK * 2),
      this.performKeywordSearch(query, topK * 2)
    ]);
    
    // Create a map to combine results
    const resultMap = new Map<string, SearchResult>();
    
    // Normalize scores to [0, 1] range
    const maxSemanticScore = Math.max(...semanticResults.map(r => r.similarity_score || 0));
    const maxKeywordScore = Math.max(...keywordResults.map(r => r.keyword_score || 0));
    
    // Add semantic results
    semanticResults.forEach(result => {
      const key = `${result.date}_${result.day}`;
      const normalizedSemantic = maxSemanticScore > 0 ? (result.similarity_score || 0) / maxSemanticScore : 0;
      resultMap.set(key, {
        ...result,
        hybrid_score: alpha * normalizedSemantic + (1 - alpha) * 0
      });
    });
    
    // Add keyword results and combine
    keywordResults.forEach(result => {
      const key = `${result.date}_${result.day}`;
      const normalizedKeyword = maxKeywordScore > 0 ? (result.keyword_score || 0) / maxKeywordScore : 0;
      
      if (resultMap.has(key)) {
        const existing = resultMap.get(key)!;
        existing.hybrid_score = alpha * (existing.similarity_score || 0) / maxSemanticScore + 
                               (1 - alpha) * normalizedKeyword;
      } else {
        resultMap.set(key, {
          ...result,
          hybrid_score: alpha * 0 + (1 - alpha) * normalizedKeyword
        });
      }
    });
    
    return Array.from(resultMap.values())
      .sort((a, b) => (b.hybrid_score || 0) - (a.hybrid_score || 0))
      .slice(0, topK);
  }

  /**
   * Combine semantic and keyword search results, avoiding duplicates
   */
  combineSearchResults(semanticResults: SearchResult[], keywordResults: SearchResult[]): SearchResult[] {
    const resultMap = new Map<string, SearchResult>();
    
    // Add semantic results first (prioritize them)
    semanticResults.forEach(result => {
      const key = `${result.date}_${result.text.substring(0, 50)}`;
      resultMap.set(key, { ...result, searchType: 'semantic' });
    });
    
    // Add keyword results if they don't already exist
    keywordResults.forEach(result => {
      const key = `${result.date}_${result.text.substring(0, 50)}`;
      if (!resultMap.has(key)) {
        resultMap.set(key, { ...result, searchType: 'keyword' });
      }
    });
    
    // Return combined results (up to 5 total)
    return Array.from(resultMap.values()).slice(0, 5);
  }

  /**
   * Generate an AI-powered contextual answer based on search results
   */
  async generateAIAnswer(query: string, searchResults: SearchResult[], env: any): Promise<string> {
    if (searchResults.length === 0) {
      return `I couldn't find any relevant journal entries for "${query}". Try a different query or add more entries!`;
    }

    // Prepare context from search results
    const context = searchResults.slice(0, 5).map((result, index) => 
      `${index + 1}. **${result.date} (${result.day})** - Relevance: ${((result.similarity_score || result.keyword_score || result.hybrid_score || 0) * 100).toFixed(0)}%\n   "${result.text}"`
    ).join('\n\n');

    console.log("Entrries", context)

    const prompt = `You are analyzing REAL journal entries from a user's personal diary. The user asked: "${query}"

Here are the EXACT journal entries I found in their database (top 3 semantic matches + top 2 keyword matches, avoiding duplicates):

${context}

IMPORTANT: Only analyze these specific entries. Do NOT make up, invent, or reference any other entries. Do NOT use examples from other people's journals.
Dont show these entries in your answer. Just give the summary.
Provide a thoughtful summary of ONLY these entries in relation to the user's query. Focus on:
- Key patterns and themes in these specific entries
- Meaningful observations about their experiences
- Gentle, supportive tone

Keep your response concise and supportive. Maximum 200 words. Be warm and encouraging.`;

    try {
      const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        prompt: prompt,
        max_tokens: 250,
        temperature: 0.7
      });

      return response.response || this.generateFallbackAnswer(query, searchResults);
    } catch (error) {
      console.error('AI generation error:', error);
      // Fallback to rule-based answer if AI fails
      return this.generateFallbackAnswer(query, searchResults);
    }
  }

  /**
   * Fallback rule-based answer generation (original method)
   */
  private generateFallbackAnswer(query: string, searchResults: SearchResult[]): string {
    if (searchResults.length === 0) {
      return "I couldn't find any relevant journal entries for your query. Try different keywords or check if you have any entries.";
    }

    const resultCount = searchResults.length;
    const queryWords = this.tokenize(query);
    const relevantEntries = searchResults.slice(0, 3);
    
    let answer = `Based on your journal entries, I found ${resultCount} relevant entry${resultCount > 1 ? 'ies' : ''}:\n\n`;
    
    relevantEntries.forEach((entry, index) => {
      const score = entry.similarity_score || entry.keyword_score || entry.hybrid_score || 0;
      answer += `${index + 1}. **${entry.date} (${entry.day})** - Relevance: ${(score * 100).toFixed(1)}%\n`;
      
      // Extract the most relevant sentence or phrase
      const sentences = entry.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      const bestSentence = sentences.reduce((best, current) => {
        const currentScore = queryWords.reduce((score, word) => 
          score + (current.toLowerCase().includes(word) ? 1 : 0), 0);
        const bestScore = queryWords.reduce((score, word) => 
          score + (best.toLowerCase().includes(word) ? 1 : 0), 0);
        return currentScore > bestScore ? current : best;
      }, sentences[0] || entry.text.substring(0, 200));
      
      answer += `   "${bestSentence.trim()}..."\n\n`;
    });
    
    // Add summary insights
    if (resultCount > 1) {
      answer += `**Summary**: Your entries show patterns related to ${queryWords.slice(0, 3).join(', ')}. `;
      if (searchResults.some(r => r.similarity_score && r.similarity_score > 0.7)) {
        answer += "There are strong thematic connections across your journal entries.";
      } else {
        answer += "These topics appear in different contexts throughout your journal.";
      }
    }
    
    return answer;
  }
}
