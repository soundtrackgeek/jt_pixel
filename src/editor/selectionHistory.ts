import type { PixelSelection } from "../types";

interface SelectionTransition {
  after: PixelSelection | null;
  before: PixelSelection | null;
  fromHistoryKey: string;
}

interface ResolveSelectionTransitionOptions {
  contextChanged: boolean;
  currentSelection: PixelSelection | null;
  nextHistoryKey: string;
  previousHistoryKey: string;
}

/**
 * Keeps transient marquee geometry aligned with document history without
 * serializing it into the project or turning selection changes into edits.
 */
export class SelectionHistoryTracker {
  private pendingTransition: SelectionTransition | null = null;
  private readonly transitions = new Map<string, SelectionTransition>();

  stageTransform(
    fromHistoryKey: string,
    before: PixelSelection | null,
    after: PixelSelection | null,
  ) {
    this.pendingTransition = { after, before, fromHistoryKey };
  }

  resolve({
    contextChanged,
    currentSelection,
    nextHistoryKey,
    previousHistoryKey,
  }: ResolveSelectionTransitionOptions) {
    if (contextChanged) {
      this.pendingTransition = null;
      return null;
    }

    if (nextHistoryKey === previousHistoryKey) return currentSelection;

    if (this.pendingTransition?.fromHistoryKey === previousHistoryKey) {
      const transition = this.pendingTransition;
      this.pendingTransition = null;
      this.transitions.set(nextHistoryKey, transition);
      return transition.after;
    }

    this.pendingTransition = null;

    const undoneTransition = this.transitions.get(previousHistoryKey);
    if (undoneTransition?.fromHistoryKey === nextHistoryKey) {
      return undoneTransition.before;
    }

    const redoneTransition = this.transitions.get(nextHistoryKey);
    if (redoneTransition?.fromHistoryKey === previousHistoryKey) {
      return redoneTransition.after;
    }

    return currentSelection;
  }
}
