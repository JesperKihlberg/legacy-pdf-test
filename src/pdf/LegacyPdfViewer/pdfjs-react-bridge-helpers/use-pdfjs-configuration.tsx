import { useEffect } from "react";
import { PDFJSLinkTarget, RhinestonePDFJSCustomTypeDef } from "../pdfjs-version-1_1_534-types";

// pdfjs is globally available
declare let PDFJS: RhinestonePDFJSCustomTypeDef;

export function usePdfjsConfiguration(pdfWorkerSrc: string) {
  // we ensure pdfjs library is configured correctly.
  useEffect(() => {
    configurePdfJs(pdfWorkerSrc);
  }, [pdfWorkerSrc]);
}

function configurePdfJs(pdfWorkerSrc: string) {
  // We set useOnlyCssZoom to default value "false", since this results in "sharp" rendering of the pdf
  // Note that historically we have rendered pdfs with this set to true, because we had problems with infinite rescaling when false
  // this has been fixed here in new design, however, we still need to be aware of this setting when implementing markup and annotations in new design
  // since we might have to figure out a way to do scaling of annotations in different way than old design when this setting is disabled
  PDFJS.useOnlyCssZoom = false;
  PDFJS.workerSrc = pdfWorkerSrc;
  // open external links in new tab
  PDFJS.externalLinkTarget = PDFJSLinkTarget.BLANK;
}
