import { useEffect } from "react";
import { PageRenderedEvent } from "../pdfjs-version-1_1_534-types";

export function usePdfJsEvents(
  pdfJsPageRenderedHandler: (e: PageRenderedEvent) => void
) {
  useEffect(() => {
    document.addEventListener(
      "pagerendered",
      pdfJsPageRenderedHandler as (e: Event) => void
    );
    return () => {
      document.removeEventListener(
        "pagerendered",
        pdfJsPageRenderedHandler as (e: Event) => void
      );
    };
  }, [pdfJsPageRenderedHandler]);
}
