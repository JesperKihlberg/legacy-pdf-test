import { useEffect, useMemo, useRef, useState } from "react";
import {
  PdfViewerVersion11534,
  PDFProgressDataVersion11534,
  PDFSourceVersion11534,
  PDFLoadingTaskVersion11534,
  PDFDocumentProxyVersion11534,
  RhinestonePDFJSCustomTypeDef,
} from "../pdfjs-version-1_1_534-types";

// pdfjs is globally available
export declare let PDFJS: RhinestonePDFJSCustomTypeDef;

export function useSetupPdfViewer(
  pdfSource: PDFSourceVersion11534,
  onDownloadProgress: (progress: PDFProgressDataVersion11534) => void
) {
  // reference to div so we can pass to PdfJs PdfViewer component
  const pdfViewContainerRef = useRef<HTMLDivElement>(null);

  // hold a reference PdfViewer instance so we can interact with it
  const [pdfViewer, setPdfViewer] = useState<PdfViewerVersion11534>();

  // hold a reference to AnnotationLayerFactory instance so we can interact with it

  useEffect(() => {
    // Pdfjs supports loading documents in chunks out of the box. However API (under the provided url endpoint) needs to support range requests.
    // Our primary variant endpoint is supporting chunks/range requests, so it should be working fine.
    // Also PDF documents should be web optimized (linearized) for pdfjs to support loading in chunks but is seams
    // that is not necessary. If it is not linearized, the difference is pdfjs seems to be requesting for chunks in sequence
    // instead of in parallel (which happens with linearized one)
    // See https://github.com/mozilla/pdf.js/issues/9537
    (async () => {
      const pdf = await PDFJS.getDocument(
        pdfSource,
        undefined,
        undefined,
        onDownloadProgress
      );
      if (!pdfViewContainerRef.current) {
        // can we end up in situation where div is not rendered before pdf is loaded?? Then there is bug here
        return;
      }

      const [pdfViewer] = renderPdf(pdf, pdfViewContainerRef.current);

      // save pdf viewer instance for later interactions
      setPdfViewer(pdfViewer);

      // save annotationLayerFactory instance for later interactions
    })();
  }, [onDownloadProgress, pdfSource]);

  return {
    pdfViewer,
    pdfViewContainerRef,
  };
}

function renderPdf(
  pdf: PDFLoadingTaskVersion11534<PDFDocumentProxyVersion11534>,
  viewerContainer: Element
): [PdfViewerVersion11534] {
  const options = {
    container: viewerContainer,
  };

  // Notice there are memory leak with PdfViewer since it hooks up on events in constructor and other places
  // but these never get removed, so instances keep existing in memory handling events even though they are orphaned
  // hopefully will be fixed when upgrading pdfjs-dist

  console.debug(
    "Creating new PDFViewer instance (it is expected that only one instance will be created, for one displaying of pdf document)"
  );
  const pdfViewer = new PDFJS.PDFViewer(options);
  // removePageBorders let's scrolling to pages more precise as we don't have to adjust for border-sizes when offsetting
  pdfViewer.removePageBorders = true;
  pdfViewer.setDocument(pdf);
  return [pdfViewer];
}
