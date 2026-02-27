# TUI Redesign (2026-02-26)

## Problems Fixed
Text overlay bugs: "aAskr", "Howldidfyou", "Noddlog" - characters rendering on same line.

**Root Causes:**
1. Wrapper boxes collapsed to zero height → same Y position for multiple elements
2. Missing text truncation → horizontal overflow
3. No minimum terminal size check
4. Over-nested box structure

## Solution
**Rebuilt `App.tsx` from scratch** with:
- `truncateText(contentWidth)` on ALL text elements
- Flat structure (minimal box nesting)
- Terminal size state + resize listener
- 60×15 minimum size check
- Simple layout (no complex responsive yet)

**Current:** Basic chat UI works, no overlay bugs
**Missing:** Today's log, activity scroll, tips, 2-column layout, help modal

## Critical Rules (OpenTUI)
```tsx
// ✅ GOOD - Direct text children
<box style={{ flexDirection: 'column' }}>
  <text>{truncateText('text', width)}</text>
</box>

// ❌ BAD - Wrapped boxes collapse
<box><text>text</text></box>
```

**Keys:**
- Truncate ALL dynamic text
- `overflow: 'hidden'` on boxes
- Boxes only for margins/borders/flex-row
- Multiple `<text>` siblings = separate lines (if not wrapped in boxes)

## Next
1. Add features incrementally: today's log, activity scroll, tips, help
2. Responsive: 2-col (≥100 width), 1-col (<100)
3. Test: 60×20, 80×24, 120×40+
