export interface EmailMetadata {
  sender: string;
  subject: string;
  date: string;
}

export class SearchTermGenerator {
  static generate(metadata: EmailMetadata): string {
    const sender = this.extractSender(metadata.sender);
    const keywords = this.extractKeywords(metadata.subject);

    return keywords ? `from:${sender} ${keywords}` : `from:${sender}`;
  }

  private static extractSender(sender: string): string {
    const trimmed = sender.trim();

    // Check if sender is in format "Name <email@domain.com>"
    const emailMatch = trimmed.match(/<([^>]+)>/);
    if (emailMatch) {
      const email = emailMatch[1];
      // Extract local part before @ (email@domain)
      const localPart = email.split('@')[0];
      return localPart;
    }

    // Return plain name as-is
    return trimmed;
  }

  private static extractKeywords(subject: string): string {
    let keywords = subject.trim();

    // Remove Re: prefix (case-insensitive)
    keywords = keywords.replace(/^Re:\s*/i, '');

    // Remove Fwd: or FW: prefix (case-insensitive)
    keywords = keywords.replace(/^Fw[dw]?:\s*/i, '');

    // Normalize multiple spaces to single space
    keywords = keywords.replace(/\s+/g, ' ').trim();

    return keywords;
  }
}
