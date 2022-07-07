/* 
  pdfjs-dist is just added to global scope when it is included in bundle
  these import statements here are not really relevant for component to build, and they could be included anywhere in application.
  this will be fixed when we upgrade pdfjs-dist, because moderne versions probably is build with modules in mind
*/
import "../insourced-3rdparty/pdfjs-dist-1_1_534_custom/web/pdf_viewer_1_1_534.css";
import "../insourced-3rdparty/pdfjs-dist-1_1_534_custom/web/compatibility";
import "../insourced-3rdparty/pdfjs-dist-1_1_534_custom/build/pdf";
import "../insourced-3rdparty/pdfjs-dist-1_1_534_custom/web/pdf_viewer";
import "../insourced-3rdparty/pdfjs-dist-1_1_534_custom/web/pdf_find_controller";
import * as React from "react";
import { useEffect, useCallback, useMemo } from "react";
import { usePdfJsPdfViewer } from "./use-pdfjs-pdf-viewer";
import { PDFProgressDataVersion11534 } from "./pdfjs-version-1_1_534-types";

export interface LegacyPdfViewerProps {
  url: string;
  pdfWorkerSrc?: string;
  // load progress is kept for "completeness" when migrating from angular code.
  // it doesnt seem like we actually show this progress anywhere in old solution but not sure
  loadProgressChanged?: (percentageProgress: number) => void;
  onContextMenu?: (mouseX: number, mouseY: number) => void;
  findBar?: Element | null;
  highlights?: string[];
  ticketId?: string;
}

/**
 * Legacy Pdf viewer based on existing customized version of PdfJs
 *
 * We could not find alternative solution in this point of time (like react-pdf for instance)
 * that has advanced features such as
 *  - Lazy rendering/virtualization of pages (big pdfs will crash browser if all pages are rendered)
 *  - Search and highlight like PDFFindcontroller
 *  - Active pdf links
 *
 * Note it is based on old customized version of PdfJs, so consider upgrading PdfJs
 *
 * Current ported functionality:
 *  - lazy loading
 *  - scroll to page
 *  - progress bar
 *  - scaling
 *
 * Not yet ported functionality:
 *  - Pdf internal links (with anchors, for example #p23), external links work out of the box
 *  - Find in pdf (maybe a task in pdf story maybe a later user story)
 * @param param0
 */
export const LegacyPdfViewer: React.FC<LegacyPdfViewerProps> = ({
  url,
  pdfWorkerSrc = "/dist/legacy.pdf.worker.js",
  loadProgressChanged,
  ticketId = "",
}) => {
  const onDownloadProgress = useCallback(
    (progress: PDFProgressDataVersion11534) => {
      if (!loadProgressChanged) return;
      const percentage = (progress.loaded / progress.total) * 100;
      loadProgressChanged(percentage);
    },
    [loadProgressChanged]
  );

  const pdfSource = useMemo(
    () => ({
      url,
      httpHeaders: ticketId ? { ticket: ticketId } : undefined,
    }),
    [url, ticketId]
  );
  const { pdfViewer, pdfViewContainerRef, pdfViewHeight, pdfPagesLayoutState } =
    usePdfJsPdfViewer(pdfSource, pdfWorkerSrc, onDownloadProgress);

  return (
    <>
      {/* We set total height of internal PdfViewer div on outer div surrounding this whole LegacyPdfViewer Component
       ensuring that it takes up all space (and body element will be correct height of all content, ensuring background doesn't get clipped).
      The next level div "container" div ensures that we don't get infinite loading of pages by restricting div height to viewport*/}

      <div
        style={{ height: `${pdfViewHeight}px` }}
        // legacy-pdf-viewer-wrapper class is used to make insourced css specific to this component (see pdf_viewer_1_1_534.css)
        className="legacy-pdf-viewer-wrapper"
      >
        <div ref={pdfViewContainerRef}>
          <div>{/* this will be internal viewer div of PDFViewer */}</div>
        </div>
      </div>
    </>
  );
};

// const portedLegacyStyle = {
//   /*
//       This part is ported from the style element found in old angularjs pdfview.html
//       Not sure if we really need these style, but dont know how to tests
//       */
//   "& .page": {
//     position: "relative",
//   },
//   "& .annotationLayer": {
//     position: "absolute",
//     top: 0,
//     left: 0,
//   },
// };
