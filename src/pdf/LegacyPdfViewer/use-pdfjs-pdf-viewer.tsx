import { useCallback } from "react";
import {
  RhinestonePDFJSCustomTypeDef,
  PDFProgressDataVersion11534,
  PDFSourceVersion11534,
} from "./pdfjs-version-1_1_534-types";
import { usePdfJsEvents } from "./pdfjs-react-bridge-helpers/use-pdfjs-events";
import { usePdfjsConfiguration } from "./pdfjs-react-bridge-helpers/use-pdfjs-configuration";
import { useSetupPdfViewer } from "./pdfjs-react-bridge-helpers/use-setup-pdf-viewer";
import { usePdfjsPageRenderedHandler as usePageRenderedHandler } from "./pdfjs-react-bridge-helpers/use-pdfjs-page-rendered-handler";

// pdfjs is globally available
export declare let PDFJS: RhinestonePDFJSCustomTypeDef;

/**
 * This hook represents the entry point for the "bridge" between React world and pdfjs PdfViewer
 */
export function usePdfJsPdfViewer(
  pdfSource: PDFSourceVersion11534,
  pdfWorkerSrc: string,
  onDownloadProgress: (progress: PDFProgressDataVersion11534) => void
) {
  usePdfjsConfiguration(pdfWorkerSrc);

  const { pdfViewer, pdfViewContainerRef } = useSetupPdfViewer(
    pdfSource,
    onDownloadProgress
  );

  const { pdfjsPageRenderedHandler, pdfViewHeight, pdfPagesLayoutState } =
    usePageRenderedHandler(pdfViewer, pdfViewContainerRef, PDFJS);

  // Hook up on PdfJs custom events
  usePdfJsEvents(pdfjsPageRenderedHandler);

  return {
    pdfViewContainerRef,
    pdfViewer,
    pdfViewHeight,
    pdfPagesLayoutState,
  };
}
