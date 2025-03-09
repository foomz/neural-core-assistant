import nlp from 'compromise';

export interface TextAnalysis {
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  entities: {
    people: string[];
    places: string[];
    organizations: string[];
    dates: string[];
  };
  stats: {
    wordCount: number;
    sentenceCount: number;
    readingTime: number;
  };
  topics: string[];
  summary: string;
}

export function analyzeText(text: string): TextAnalysis {
  const doc = nlp(text);
  
  // Sentiment Analysis
  const sentiment = analyzeSentiment(doc);
  
  // Entity Recognition
  const entities = {
    people: doc.people().out('array'),
    places: doc.places().out('array'),
    organizations: doc.organizations().out('array'),
    dates: doc.dates().out('array'),
  };
  
  // Text Statistics
  const sentences = doc.sentences().out('array');
  const words = doc.words().out('array');
  const stats = {
    wordCount: words.length,
    sentenceCount: sentences.length,
    readingTime: Math.ceil(words.length / 200), // Average reading speed: 200 words/minute
  };
  
  // Topic Extraction
  const topics = extractTopics(doc);
  
  // Text Summarization
  const summary = generateSummary(doc, sentences);
  
  return {
    sentiment,
    entities,
    stats,
    topics,
    summary,
  };
}

function analyzeSentiment(doc: any): TextAnalysis['sentiment'] {
  const positiveWords = doc.match('#Positive').length;
  const negativeWords = doc.match('#Negative').length;
  const totalWords = doc.words().length;
  
  const score = (positiveWords - negativeWords) / totalWords;
  
  return {
    score,
    label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
  };
}

function extractTopics(doc: any): string[] {
  const nouns = doc.nouns().out('array');
  const verbs = doc.verbs().toInfinitive().out('array');
  const adjectives = doc.adjectives().out('array');
  
  // Combine and deduplicate terms
  const terms = [...new Set([...nouns, ...verbs, ...adjectives])];
  
  // Sort by frequency and return top 5
  return terms
    .sort((a, b) => doc.match(b).length - doc.match(a).length)
    .slice(0, 5);
}

function generateSummary(doc: any, sentences: string[]): string {
  if (sentences.length <= 2) return sentences.join(' ');
  
  // Score sentences based on important terms
  const sentenceScores = sentences.map(sentence => {
    const sentenceDoc = nlp(sentence);
    const score =
      sentenceDoc.match('#Noun').length * 2 +
      sentenceDoc.match('#Verb').length +
      sentenceDoc.match('#Adjective').length;
    return { sentence, score };
  });
  
  // Get top 2-3 sentences
  const summaryLength = Math.min(3, Math.ceil(sentences.length / 2));
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, summaryLength)
    .map(item => item.sentence)
    .sort((a, b) => sentences.indexOf(a) - sentences.indexOf(b)); // Restore original order
  
  return topSentences.join(' ');
}

export function highlightEntities(text: string): string {
  const doc = nlp(text);
  let highlightedText = text;
  
  const entities = {
    people: doc.people().out('array'),
    places: doc.places().out('array'),
    organizations: doc.organizations().out('array'),
    dates: doc.dates().out('array'),
  };
  
  // Add highlighting markers
  Object.entries(entities).forEach(([type, items]) => {
    items.forEach((item: string) => {
      const regex = new RegExp(`\\b${item}\\b`, 'g');
      highlightedText = highlightedText.replace(
        regex,
        `<span class="entity-${type}">${item}</span>`
      );
    });
  });
  
  return highlightedText;
}

export function findKeyPhrases(text: string): string[] {
  const doc = nlp(text);
  
  // Find noun phrases
  const nounPhrases = doc.match('#Adjective? #Noun+').out('array');
  
  // Find verb phrases
  const verbPhrases = doc.match('#Adverb? #Verb #Noun+').out('array');
  
  // Combine and deduplicate
  const phrases = [...new Set([...nounPhrases, ...verbPhrases])];
  
  // Sort by length and return top 5
  return phrases
    .sort((a, b) => b.length - a.length)
    .slice(0, 5);
}

export function getTextStatistics(text: string) {
  const doc = nlp(text);
  
  return {
    characters: text.length,
    words: doc.words().length,
    sentences: doc.sentences().length,
    paragraphs: text.split('\n\n').length,
    readingTime: Math.ceil(doc.words().length / 200), // minutes
    uniqueWords: new Set(doc.words().out('array')).size,
    complexity: calculateTextComplexity(doc),
  };
}

function calculateTextComplexity(doc: any) {
  const words = doc.words().out('array');
  const longWords = words.filter((word: string) => word.length > 6).length;
  const longWordRatio = longWords / words.length;
  
  const sentences = doc.sentences().out('array');
  const avgWordsPerSentence = words.length / sentences.length;
  
  // Score from 0-100 based on word length and sentence complexity
  return Math.min(
    100,
    Math.round((longWordRatio * 50 + (avgWordsPerSentence / 20) * 50))
  );
}