import { PDFDataRangeTransport } from "pdfjs-dist";

/**
 * own hybrid type definition of build in and some things not on the build in
 * (remember we are using an old version of pdfjs library)
 */
export type RhinestonePDFJSCustomTypeDef = PDFJSStaticVersion11534 & {
  getDocument(
    url: PDFSourceVersion11534,
    pdfDataRangeTransport?: PDFDataRangeTransport,
    passwordCallback?: (
      fn: (password: string) => void,
      reason: string
    ) => string,
    progressCallback?: (progressData: PDFProgressDataVersion11534) => void
  ): PDFLoadingTaskVersion11534<PDFDocumentProxyVersion11534>;
  PDFViewer: typeof PdfViewerVersion11534;
  PDFFindController: typeof PDFFindControllerVersion11534;
  PDFFindBar: typeof PDFFindBarVersion11534;
  PDFLinkService: typeof PdfLinkServiceVersion11534;
  AnnotationUtils: AnnotationUtilsVersion11534;
  Util: UtilVersion11534;
};

/**
 * This scroll options type was deducted from studying the switch case in
 *
 * scrollPageIntoView function in pdf_viewer.js (line 2617-2709)
 *
 * its a bit weird with funky array with nothing on first position
 */
export type PdfViewerVersion11534ScrollDestinationOptions =
  | [
    undefined,
    {
      name: "XYZ" | "Fit" | "FitB";
    },
    number, // x
    number, // y
    number // scale
  ]
  | [
    undefined,
    {
      name: "FitH" | "FitBH" | "FitV" | "FitBV";
    },
    number? // y
  ]
  | [
    undefined,
    {
      name: "FitR";
    },
    number, // x
    number, // y
    number, // width
    number // height
  ];

/**
 * This is just declaration of the parts of the PdfViewer that we actually use
 */
export declare class PdfViewerVersion11534 {
  constructor(options: unknown);
  container: Element;
  viewer: Element;
  scrollPageIntoView: (
    pageNumber: number,
    dest?: PdfViewerVersion11534ScrollDestinationOptions
  ) => void;
  _pages: PDFPageViewVersion11534[];
  currentPageNumber: number;
  pagesCount: number;
  getPageView: (pageIndex: number) => PDFPageViewVersion11534;
  setDocument(
    pdf: PDFLoadingTaskVersion11534<PDFDocumentProxyVersion11534>
  ): void;
  setFindController(findController: PDFFindControllerVersion11534): void;
  removePageBorders: boolean;
  pdfDocument: PDFDocumentProxyVersion11534;
}

export declare class PdfLinkServiceVersion11534 {
  constructor();
  setViewer: (pdfViewer: PdfViewerVersion11534) => void;
  getDestinationHash: (link: any) => any;
}

export declare class PDFFindControllerVersion11534 {
  constructor(options: { pdfViewer: PdfViewerVersion11534 });
  listenWindowEvents(): void;
  onUpdateState(state: unknown, previous: unknown, matchCount: unknown): void;
  onUpdateResultsCount(matchCount: number): void;
}

export declare class PDFFindBarVersion11534 {
  constructor(options: {
    findController: PDFFindControllerVersion11534;
    bar: Element;
    findField: Element | null;
    toggleButton?: Element | null;
    highlightAllCheckbox?: Element | null;
    caseSensitiveCheckbox?: Element | null;
    findMsg?: Element | null;
    findSpinner?: Element | null;
    findPreviousButton?: Element | null;
    findNextButton?: Element | null;
  });
  listenWindowEvents(): void;
  updateUIState: (
    state: unknown,
    previous: unknown,
    matchCount: unknown
  ) => void;
  updateResultsCount: (matchCount: number) => void;
}

export declare class AnnotationUtilsVersion11534 {
  getHtmlElement: (data: any, commonObjs: any) => any;
}

export declare class UtilVersion11534 {
  normalizeRect: (data: any[]) => any;
}

export interface PageRenderedEvent extends CustomEvent {
  detail: {
    pageNumber: number;
  };
}

/**
 * This is 1.1.534 version typing of this PDFPageProxy
 */
export interface PDFPageProxyVersion11534 {
  getViewport(scale: number): { width: number };
}
/**
 * This is 1.1.534 version typing of this PDFPageView
 */
export interface PDFPageViewVersion11534 {
  id: number;
  update(newScale: number): void;
  pdfPage: PDFPageProxyVersion11534;
  renderingState: PdfJsRenderingStates;
  viewport: PDFPageViewportVersion11534;
  div: HTMLDivElement;
  canvas: HTMLCanvasElement;
  scale: number;
}

export interface PDFProgressDataVersion11534 {
  loaded: number;
  total: number;
}

export interface PDFLoadingTaskVersion11534<T> {
  load: () => Promise<T>;
}

export interface PDFJSStaticVersion11534 {
  workerSrc: string;
  useOnlyCssZoom: boolean;
  externalLinkTarget: PDFJSLinkTarget;
}

export type PDFDocumentProxyVersion11534 = unknown;

export type PDFPageViewportVersion11534 = {
  fontScale: number;
  height: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scale: number;
  transform: number[];
  viewBox: number[];
  width: number;
};

export interface PDFSourceVersion11534 {
  url: string;
  httpHeaders:
  | {
    ticket: string;
  }
  | undefined;
}

export enum PdfJsRenderingStates {
  INITIAL = 0,
  RUNNING = 1,
  PAUSED = 2,
  FINISHED = 3
}

export enum PDFJSLinkTarget {
  NONE = 0, // Default value.
  SELF = 1,
  BLANK = 2,
  PARENT = 3,
  TOP = 4
};
