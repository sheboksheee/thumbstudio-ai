/**
 * Copy text to the clipboard. Tries the synchronous execCommand path first so
 * the call stays inside the user gesture (required to open ChatGPT in a new
 * tab right afterwards without popup blocking), then falls back to the async
 * Clipboard API.
 */
export function copyTextSync(text: string): boolean {
  if (typeof document === "undefined") return false;
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.top = "-1000px";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  const sel = document.getSelection();
  const prev = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (prev && sel) {
    sel.removeAllRanges();
    sel.addRange(prev);
  }
  return ok;
}

export async function copyText(text: string): Promise<boolean> {
  if (copyTextSync(text)) return true;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
