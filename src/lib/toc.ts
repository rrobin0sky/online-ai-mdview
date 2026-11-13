import { TocItem } from "../types";

export function extractTocFromContainer(container: HTMLElement): TocItem[] {
  const headings = container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6");
  const items: TocItem[] = [];

  headings.forEach((heading, index) => {
    let id = heading.id;
    if (!id) {
      id = `heading-${index}`;
      heading.id = id;
    }

    const level = parseInt(heading.tagName.substring(1), 10);
    const text = heading.textContent?.trim() || "";

    if (text) {
      items.push({
        id,
        text,
        level,
      });
    }
  });

  return items;
}

export function scrollToHeading(id: string, scrollContainer?: HTMLElement | null) {
  let element = document.getElementById(id);
  if (!element) {
    try {
      element =
        document.getElementById(decodeURIComponent(id)) ||
        document.getElementById(encodeURIComponent(id));
    } catch {
      // ignore
    }
  }
  if (!element) return;

  const container = scrollContainer || document.getElementById("reader-container");
  if (container) {
    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const offset = elementRect.top - containerRect.top + container.scrollTop - 28;

    container.scrollTo({
      top: Math.max(0, offset),
      behavior: "smooth",
    });
  } else {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
