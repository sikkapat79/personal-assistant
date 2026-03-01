import { AGENT_NAME } from '../../../../../config/branding';

/**
 * Word-wrap text to fit within a specified width.
 * Preserves existing line breaks and wraps long lines at word boundaries.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];

  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      lines.push('');
      continue;
    }

    if (paragraph.length <= maxWidth) {
      lines.push(paragraph);
      continue;
    }

    // Wrap long lines at word boundaries
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      // If a single word is longer than maxWidth, force break it
      if (word.length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
        // Break long word into chunks
        for (let i = 0; i < word.length; i += maxWidth) {
          lines.push(word.slice(i, i + maxWidth));
        }
        continue;
      }

      const testLine = currentLine ? `${currentLine} ${word}` : word;

      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine.trim());
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }
  }

  return lines;
}

/**
 * Truncate text to fit within a specified width, adding ellipsis if needed.
 */
export function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (maxWidth === 1) return '…';
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 1) + '…';
}

/**
 * Calculate total number of wrapped lines for chat history.
 * Each message is wrapped and the line count is summed.
 */
export function calculateChatLineCount(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  contentWidth: number
): number {
  let totalLines = 0;
  for (const msg of history) {
    const rolePrefix = msg.role === 'user' ? 'You: ' : `${AGENT_NAME}: `;
    const wrappedLines = wrapText(msg.content, contentWidth - rolePrefix.length);
    totalLines += wrappedLines.length;
  }
  return totalLines;
}
