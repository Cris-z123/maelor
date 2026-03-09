import { describe, it, expect } from 'vitest';
import { SearchTermGenerator, EmailMetadata } from '../../../../src/shared/utils/SearchTermGenerator';

describe('SearchTermGenerator', () => {
  describe('generate', () => {
    it('should generate search term from email with name and address', () => {
      const metadata: EmailMetadata = {
        sender: 'John Doe <john@company.com>',
        subject: 'Q3 Budget Review',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:john Q3 Budget Review');
    });

    it('should generate search term from plain name sender', () => {
      const metadata: EmailMetadata = {
        sender: 'John Doe',
        subject: 'Meeting Tomorrow',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:John Doe Meeting Tomorrow');
    });

    it('should remove Re: prefix from subject', () => {
      const metadata: EmailMetadata = {
        sender: 'Alice <alice@example.com>',
        subject: 'Re: Project Update',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:alice Project Update');
    });

    it('should remove Fwd: prefix from subject', () => {
      const metadata: EmailMetadata = {
        sender: 'Bob <bob@example.com>',
        subject: 'Fwd: Important Notice',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:bob Important Notice');
    });

    it('should normalize multiple spaces in subject', () => {
      const metadata: EmailMetadata = {
        sender: 'Charlie <charlie@example.com>',
        subject: 'Task    with    spaces',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:charlie Task with spaces');
    });

    it('should handle empty subject', () => {
      const metadata: EmailMetadata = {
        sender: 'Charlie <charlie@example.com>',
        subject: '',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:charlie');
    });

    it('should handle trimmed input properly', () => {
      const metadata: EmailMetadata = {
        sender: '  Dave <dave@example.com>  ',
        subject: '  Trimmed Subject  ',
        date: '2024-01-15'
      };

      const result = SearchTermGenerator.generate(metadata);
      expect(result).toBe('from:dave Trimmed Subject');
    });
  });
});
