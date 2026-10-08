import { useEffect } from "react";

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} – The Rooted Pages` : "The Rooted Pages";
  }, [title]);
}
