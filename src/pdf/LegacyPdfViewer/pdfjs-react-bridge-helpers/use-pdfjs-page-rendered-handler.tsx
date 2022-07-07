import { useState, useCallback, RefObject } from "react";
import {
  PdfViewerVersion11534,
  PDFPageProxyVersion11534,
  PdfJsRenderingStates,
  PDFPageViewVersion11534,
  PageRenderedEvent,
  RhinestonePDFJSCustomTypeDef
} from "../pdfjs-version-1_1_534-types";
import "./pdfjs-links.css";
import { PdfPagesLayoutState } from "../pdf-pages-layout-state";

export function usePdfjsPageRenderedHandler(
  pdfViewer: PdfViewerVersion11534 | undefined,
  pdfViewContainerRef: RefObject<HTMLDivElement>,
  pdfJS: RhinestonePDFJSCustomTypeDef
) {
  // Tracking total height of internal pdf viewer which will be the height of all pages
  const [pdfViewHeight, setPdfViewHeight] = useState(0);

  // Track page position and scale
  const [pdfPagesLayoutState, setPagesLayoutState] =
    useState<PdfPagesLayoutState>({});

  const pdfjsPageRenderedHandler = useCallback(
    (e: PageRenderedEvent) => {
      if (!pdfViewer || !pdfViewContainerRef.current) return;
      const pageNumber = e.detail.pageNumber;
      scalePdfPageView(pageNumber, pdfViewer);
      setPdfViewHeight(pdfViewer.viewer.getBoundingClientRect().height);
      setPagesLayoutState(prev => ({
        ...prev,
        [pageNumber]: {
          offsetTop: (e.target as HTMLElement)?.offsetTop ?? 0,
          viewPortScale: pdfViewer.getPageView(pageNumber - 1).viewport.scale
        }
      }));
      addLinkAnnotations(pdfViewer.getPageView(pageNumber - 1), pdfJS);
    },
    [pdfViewContainerRef, pdfViewer, pdfJS]
  );
  return {
    pdfjsPageRenderedHandler,
    pdfViewHeight,
    pdfPagesLayoutState
  };
}

function scalePdfPageView(
  pageNumber: number,
  pdfViewer: PdfViewerVersion11534
) {
  const pageView = pdfViewer.getPageView(pageNumber - 1);

  const newScale = calculatePdfPageScale(pdfViewer, pageView.pdfPage);
  // prevent infinite loop when rendering by checking that scale is already set within some meaningful precision
  if (Math.abs(pageView.scale - newScale) < 0.01) return;
  pageView.update(newScale);
}

export function scaleAllRenderedPages(
  pdfViewer: PdfViewerVersion11534 | undefined
) {
  if (!pdfViewer) return;
  pdfViewer._pages
    .filter(
      (page: PDFPageViewVersion11534) =>
        page.renderingState === PdfJsRenderingStates.FINISHED
    )
    .forEach(p => scalePdfPageView(p.id, pdfViewer));
}

function calculatePdfPageScale(
  pdfViewer: PdfViewerVersion11534,
  page: PDFPageProxyVersion11534
) {
  // Pdf.js Viewer tries to convert css pixels to "screen pixels" (96 dpi rule).
  // In order to calculate the correct scale for displaying the pdf page we need to take this into account.
  const cssUnits = 96.0 / 72.0;
  const containerMargin = 2;

  return (
    (pdfViewer.container.getBoundingClientRect().width - containerMargin) /
    page.getViewport(1.0).width /
    cssUnits
  );
}

function addLinkAnnotations(
  pageView: any,
  pdfJS: RhinestonePDFJSCustomTypeDef
) {
  const page = pageView.pdfPage;
  const scale = pageView.viewport.scale;
  const linkService = new pdfJS.PDFLinkService();

  page.getAnnotations().then((annotationsData: any) => {
    for (const annotation of annotationsData) {
      if (annotation.subtype !== "Link") {
        continue;
      }

      if (!annotation.url) {
        // Internal link
        annotation.url = linkService.getDestinationHash(annotation.dest);
        if (!annotation.url) {
          continue;
        }
      }

      const element = pdfJS.AnnotationUtils.getHtmlElement(
        annotation,
        page.commonObjs
      );

      let rect = annotation.rect;
      const view = page.view;

      rect = pdfJS.Util.normalizeRect([
        rect[0],
        view[3] - rect[1] + view[1],
        rect[2],
        view[3] - rect[3] + view[1]
      ]);

      element.style.left = rect[0] * scale + "px";
      element.style.top = rect[1] * scale + "px";
      element.style.height = (rect[3] - rect[1]) * scale + "px";
      element.style.width = (rect[2] - rect[0]) * scale + "px";
      element.style.position = "absolute";
      element.style.display = "block";

      pageView.div.append(element);
    }
  });
}
