/**
 * §58 "Reorder images": pure order math shared by the media manager's
 * drag-to-reorder (desktop) and its move buttons (touch/keyboard — HTML5
 * drag events never fire on phones, and the checklist expects phone use).
 */

/** Move the item at `from` to `to`; out-of-range or no-op inputs return the
 *  list unchanged. Returns a new array — the input is never mutated. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= list.length ||
    to >= list.length
  ) {
    return [...list];
  }
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
