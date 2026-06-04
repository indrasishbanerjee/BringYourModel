/**
 * PromptShield - Middleware for detecting and mitigating prompt injection attacks
 */
export class PromptShield {
  private patterns: RegExp[];
  private blockedPhrases: string[];

  constructor() {
    // Patterns for detecting potential prompt injection
    this.patterns = [
      // "Ignore previous instructions" variations
      /ignore\s+(all\s+)?(previous\s+|earlier\s+)?(instructions?|prompts?|commands?)/i,
      
      // "Disregard" variations
      /disregard\s+(all\s+)?(previous\s+|earlier\s+)?(instructions?|prompts?|rules?)/i,
      
      // "Forget" variations
      /forget\s+(all\s+)?(previous\s+|earlier\s+)?(instructions?|prompts?|context)/i,
      
      // System prompt injection attempts
      /system\s*:\s*/i,
      /you are now\s*:/i,
      /new role\s*:/i,
      
      // Attempts to inject separator patterns
      /\n\n###\s*\n\n/i,
      /\n\n---\s*\n\n/i,
      
      // Hidden unicode characters (tags, zero-width chars)
      /[\uE0000-\uE007F]/,
      
      // Base64 blobs (potential encoded payloads)
      /[A-Za-z0-9+/]{100,}={0,2}/,
      
      // Delimiter manipulation
      /\[\s*INST\s*\]/i,
      /<<\s*SYS\s*>>/i,
      /<\|im_start\|>/i,
      /<\|system\|>/i,
    ];

    this.blockedPhrases = [
      'ignore previous instructions',
      'disregard previous instructions',
      'forget everything',
      'you are now a',
      'system override',
      'admin mode',
      'developer mode',
      'DAN mode',
      'jailbreak',
    ];
  }

  /**
   * Analyze and shield a prompt
   * Sanitizes input by removing dangerous characters and flagging suspicious content
   */
  shield(input: string): string {
    let sanitized = input;

    // Remove C0 control characters (0x00-0x1F) except tab (0x09), newline (0x0A), carriage return (0x0D)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

    // Remove zero-width spaces and invisible joiners used for hidden text
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // Remove Unicode tag characters (U+E0000-U+E007F) - used for invisible tagging attacks
    // These require surrogate pair representation in JavaScript
    sanitized = sanitized.replace(/[\uDB40-\uDB40][\uDC00-\uDC7F]/g, '');

    // Detect and flag base64-encoded blobs (potential encoded payloads)
    // Match sequences of 100+ base64 characters that look like encoded data
    sanitized = sanitized.replace(
      /(?:[A-Za-z0-9+/]{4}){25,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g,
      '[BASE64_CONTENT_REMOVED]'
    );

    // Remove homoglyph attacks: confusable Greek/Cyrillic letters that look like Latin
    // Greek: αο (alpha, omicron) that look like 'a', 'o'
    // Cyrillic: аео (a, e, o) that look like Latin equivalents
    sanitized = sanitized
      .replace(/[\u03B1\u03BF]/g, '') // Greek alpha-like, omicron
      .replace(/[\u0430\u0435\u043E]/g, ''); // Cyrillic а, е, о

    return sanitized.trim();
  }

  /**
   * Check if input contains potential injection attempts
   */
  detect(input: string): {
    isSuspicious: boolean;
    confidence: 'low' | 'medium' | 'high';
    detectedPatterns: string[];
  } {
    const detectedPatterns: string[] = [];
    let score = 0;

    // Check regex patterns
    for (const pattern of this.patterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
        score += 1;
      }
    }

    // Check blocked phrases
    const lowerInput = input.toLowerCase();
    for (const phrase of this.blockedPhrases) {
      if (lowerInput.includes(phrase)) {
        detectedPatterns.push(`blocked_phrase: ${phrase}`);
        score += 2;
      }
    }

    // Calculate confidence
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (score >= 5) {
      confidence = 'high';
    } else if (score >= 2) {
      confidence = 'medium';
    }

    return {
      isSuspicious: score > 0,
      confidence,
      detectedPatterns,
    };
  }

  /**
   * Validate if input is safe to process
   */
  validate(input: string): {
    safe: boolean;
    reason?: string;
  } {
    const detection = this.detect(input);
    
    if (detection.confidence === 'high') {
      return {
        safe: false,
        reason: `High confidence injection detected: ${detection.detectedPatterns.join(', ')}`,
      };
    }

    if (detection.confidence === 'medium' && detection.detectedPatterns.length > 2) {
      return {
        safe: false,
        reason: `Multiple suspicious patterns detected: ${detection.detectedPatterns.join(', ')}`,
      };
    }

    return { safe: true };
  }

  /**
   * Sanitize input by removing suspicious content
   */
  sanitize(input: string): string {
    let sanitized = input;

    // Remove common injection phrases
    for (const phrase of this.blockedPhrases) {
      const regex = new RegExp(phrase.replace(/\s+/g, '\\s+'), 'gi');
      sanitized = sanitized.replace(regex, '[REMOVED]');
    }

    // Remove separator injection attempts
    sanitized = sanitized.replace(/\n\n###\s*\n\n/g, '\n\n');
    sanitized = sanitized.replace(/\n\n---\s*\n\n/g, '\n\n');

    return sanitized;
  }

  /**
   * Add a custom pattern to detect
   */
  addPattern(pattern: RegExp): void {
    this.patterns.push(pattern);
  }

  /**
   * Add a custom blocked phrase
   */
  addBlockedPhrase(phrase: string): void {
    this.blockedPhrases.push(phrase.toLowerCase());
  }
}