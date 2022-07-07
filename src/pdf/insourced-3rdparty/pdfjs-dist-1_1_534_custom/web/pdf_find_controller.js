/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/* NOTICE: This script has been modified to better integrated with fundament customers' wishes.
 *
 * If you need to update this script, please look at the history and merge old changes into the updated version.
 */

(function pdfViewerWrapper() {
  "use strict";

  /**
   * Scrolls specified element into view of its parent.
   * @param {Object} element - The element to be visible.
   * @param {Object} spot - An object with optional top and left properties,
   *   specifying the offset from the top left edge.
   * @param {boolean} skipOverflowHiddenElements - Ignore elements that have
   *   the CSS rule `overflow: hidden;` set. The default is false.
   */
  var scrollIntoView = function scrollIntoView(
    element,
    spot,
    skipOverflowHiddenElements
  ) {
    // Assuming offsetParent is available (it's not available when viewer is in
    // hidden iframe or object). We have to scroll: if the offsetParent is not set
    // producing the error. See also animationStartedClosure.
    var parent = element.offsetParent;
    if (!parent) {
      console.error("offsetParent is not set -- cannot scroll");
      return;
    }
    // var checkOverflow = skipOverflowHiddenElements || false;
    var offsetY = element.offsetTop + element.clientTop;
    var offsetX = element.offsetLeft + element.clientLeft;
    var lastRealParent = parent;
    while (
      true //parent.clientHeight === parent.scrollHeight ||
      //(checkOverflow && getComputedStyle(parent).overflow === 'hidden')
    ) {
      if (parent.dataset._scaleY) {
        offsetY /= parent.dataset._scaleY;
        offsetX /= parent.dataset._scaleX;
      }
      offsetY += parent.offsetTop;
      offsetX += parent.offsetLeft;
      parent = parent.offsetParent;
      if (!parent) {
        break;
      } else {
        lastRealParent = parent;
      }
    }
    if (spot) {
      if (spot.top !== undefined) {
        offsetY += spot.top;
      }
      if (spot.left !== undefined) {
        offsetX += spot.left;
      }
    }

    // Decrease scroll offset by arbitrary value so that current element is in view
    offsetY -= 300;

    var scrollNode = lastRealParent;
    while (scrollNode != null && typeof scrollNode.scrollTop != "undefined") {
      scrollNode.scrollTop = offsetY;
      scrollNode.scrollLeft = offsetX;

      scrollNode = scrollNode.parentNode;
    }
  };

  var FindStates = {
    FIND_FOUND: 0,
    FIND_NOTFOUND: 1,
    FIND_WRAPPED: 2,
    FIND_PENDING: 3
  };

  var FIND_SCROLL_OFFSET_TOP = -120;
  var FIND_SCROLL_OFFSET_LEFT = -400;

  var CHARACTERS_TO_NORMALIZE = {
    "\u2018": "'", // Left single quotation mark
    "\u2019": "'", // Right single quotation mark
    "\u201A": "'", // Single low-9 quotation mark
    "\u201B": "'", // Single high-reversed-9 quotation mark
    "\u201C": '"', // Left double quotation mark
    "\u201D": '"', // Right double quotation mark
    "\u201E": '"', // Double low-9 quotation mark
    "\u201F": '"', // Double high-reversed-9 quotation mark
    "\u00BC": "1/4", // Vulgar fraction one quarter
    "\u00BD": "1/2", // Vulgar fraction one half
    "\u00BE": "3/4" // Vulgar fraction three quarters
  };

  /**
   * Provides "search" or "find" functionality for the PDF.
   * This object actually performs the search for a given string.
   */
  var PDFFindController = (function PDFFindControllerClosure() {
    function PDFFindController(options) {
      this.pdfViewer = options.pdfViewer || null;

      this.onUpdateResultsCount = null;
      this.onUpdateState = null;

      this.reset();

      // Compile the regular expression for text normalization once.
      var replace = Object.keys(CHARACTERS_TO_NORMALIZE).join("");
      this.normalizationRegex = new RegExp("[" + replace + "]", "g");
    }

    PDFFindController.prototype = {
      listenWindowEvents: function PDFFindController_listenWindowEvents() {
        var events = [
          "find",
          "findagain",
          "findhighlightallchange",
          "findcasesensitivitychange"
        ];

        var handleEvent = function(e) {
          this.executeCommand(e.type, e.detail);
        }.bind(this);

        for (var i = 0, len = events.length; i < len; i++) {
          window.addEventListener(events[i], handleEvent);
        }
      },

      reset: function PDFFindController_reset() {
        this.startedTextExtraction = false;
        this.extractTextPromises = [];
        this.pendingFindMatches = Object.create(null);
        this.active = false; // If active, find results will be highlighted.
        this.pageContents = []; // Stores the text for each page.
        this.pageMatches = [];
        this.pageMatchIndexStart = [];
        this.matchCount = 0;
        this.curTotalIndex = 0;
        this.selected = {
          // Currently selected match.
          pageIdx: -1,
          matchIdx: -1
        };
        this.offset = {
          // Where the find algorithm currently is in the document.
          pageIdx: null,
          matchIdx: null
        };
        this.pagesToSearch = null;
        this.resumePageIdx = null;
        this.state = null;
        this.dirtyMatch = false;
        this.findTimeout = null;

        this.firstPagePromise = new Promise(
          function(resolve) {
            this.resolveFirstPage = resolve;
          }.bind(this)
        );
      },

      normalize: function PDFFindController_normalize(text) {
        return text.replace(this.normalizationRegex, function(ch) {
          return CHARACTERS_TO_NORMALIZE[ch];
        });
      },

      calcFindMatch: function PDFFindController_calcFindMatch(pageIndex) {
        var pageContent = this.normalize(this.pageContents[pageIndex]);
        var query = this.normalize(this.state.query);
        var caseSensitive = this.state.caseSensitive;
        var queryLen = query.length;

        if (queryLen === 0) {
          // Do nothing: the matches should be wiped out already.
          return;
        }

        if (!caseSensitive) {
          pageContent = pageContent.toLowerCase();
          query = query.toLowerCase();
        }

        var matches = [];
        var matchIdx = -queryLen;
        while (true) {
          matchIdx = pageContent.indexOf(query, matchIdx + queryLen);
          if (matchIdx === -1) {
            break;
          }
          matches.push(matchIdx);
        }
        this.pageMatches[pageIndex] = matches;
        this.pageMatchIndexStart[pageIndex] =
          pageIndex == 0
            ? 0
            : this.pageMatchIndexStart[pageIndex - 1] +
              this.pageMatches[pageIndex - 1].length;

        this.updatePage(pageIndex);
        if (this.resumePageIdx === pageIndex) {
          this.resumePageIdx = null;
          this.nextPageMatch();
        }

        // Update the matches count
        if (matches.length > 0) {
          this.matchCount += matches.length;
          this.updateUIResultsCount();
        }
      },

      extractText: function PDFFindController_extractText() {
        if (this.startedTextExtraction) {
          return;
        }
        this.startedTextExtraction = true;

        this.pageContents = [];
        var extractTextPromisesResolves = [];
        var numPages = this.pdfViewer.pagesCount;
        for (var i = 0; i < numPages; i++) {
          this.extractTextPromises.push(
            new Promise(function(resolve) {
              extractTextPromisesResolves.push(resolve);
            })
          );
        }

        var self = this;
        function extractPageText(pageIndex) {
          self.pdfViewer
            .getPageTextContent(pageIndex)
            .then(function textContentResolved(textContent) {
              var textItems = textContent.items;
              var str = [];

              for (var i = 0, len = textItems.length; i < len; i++) {
                str.push(textItems[i].str);
              }

              // Store the pageContent as a string.
              self.pageContents.push(str.join(""));

              extractTextPromisesResolves[pageIndex](pageIndex);
              if (pageIndex + 1 < self.pdfViewer.pagesCount) {
                extractPageText(pageIndex + 1);
              }
            });
        }
        extractPageText(0);
      },

      executeCommand: function PDFFindController_executeCommand(cmd, state) {
        if (this.state === null || cmd !== "findagain") {
          this.dirtyMatch = true;
        }
        this.state = state;
        this.updateUIState(FindStates.FIND_PENDING);

        this.firstPagePromise.then(
          function() {
            this.extractText();

            clearTimeout(this.findTimeout);
            if (cmd === "find") {
              // Only trigger the find action after 250ms of silence.
              this.findTimeout = setTimeout(this.nextMatch.bind(this), 250);
            } else {
              this.nextMatch();
            }
          }.bind(this)
        );
      },

      updatePage: function PDFFindController_updatePage(index) {
        if (this.selected.pageIdx === index) {
          // If the page is selected, scroll the page into view, which triggers
          // rendering the page, which adds the textLayer. Once the textLayer is
          // build, it will scroll onto the selected match.
          this.pdfViewer.scrollPageIntoView(index + 1);
        }

        var page = this.pdfViewer.getPageView(index);
        if (page.textLayer) {
          page.textLayer.updateMatches();
        }
      },

      nextMatch: function PDFFindController_nextMatch() {
        var previous = this.state.findPrevious;
        var currentPageIndex = this.pdfViewer.currentPageNumber - 1;
        var numPages = this.pdfViewer.pagesCount;

        this.active = true;

        if (this.dirtyMatch) {
          // Need to recalculate the matches, reset everything.
          this.dirtyMatch = false;
          this.selected.pageIdx = this.selected.matchIdx = -1;
          this.offset.pageIdx = 0; //currentPageIndex;
          this.offset.matchIdx = null;
          this.hadMatch = false;
          this.resumePageIdx = null;
          this.pageMatches = [];
          this.pageMatchIndexStart = [];
          this.matchCount = 0;
          this.curTotalIndex = 0;
          var self = this;

          for (var i = 0; i < numPages; i++) {
            // Wipe out any previous highlighted matches.
            this.updatePage(i);

            // As soon as the text is extracted start finding the matches.
            if (!(i in this.pendingFindMatches)) {
              this.pendingFindMatches[i] = true;
              this.extractTextPromises[i].then(function(pageIdx) {
                delete self.pendingFindMatches[pageIdx];
                self.calcFindMatch(pageIdx);
              });
            }
          }
        }

        // If there's no query there's no point in searching.
        if (this.state.query === "") {
          this.curTotalIndex = 0;
          this.updateUIState(FindStates.FIND_FOUND);
          return;
        }

        // If we're waiting on a page, we return since we can't do anything else.
        if (this.resumePageIdx) {
          return;
        }

        var offset = this.offset;
        // Keep track of how many pages we should maximally iterate through.
        this.pagesToSearch = numPages;
        // If there's already a matchIdx that means we are iterating through a
        // page's matches.
        if (offset.matchIdx !== null) {
          var numPageMatches = this.pageMatches[offset.pageIdx].length;
          if (
            (!previous && offset.matchIdx + 1 < numPageMatches) ||
            (previous && offset.matchIdx > 0)
          ) {
            // The simple case; we just have advance the matchIdx to select
            // the next match on the page.
            this.hadMatch = true;
            offset.matchIdx = previous
              ? offset.matchIdx - 1
              : offset.matchIdx + 1;
            this.updateMatch(true);
            return;
          }
          // We went beyond the current page's matches, so we advance to
          // the next page.
          this.advanceOffsetPage(previous);
        }
        // Start searching through the page.
        this.nextPageMatch();
      },

      matchesReady: function PDFFindController_matchesReady(matches) {
        var offset = this.offset;
        var numMatches = matches.length;
        var previous = this.state.findPrevious;
        if (numMatches) {
          // There were matches for the page, so initialize the matchIdx.
          this.hadMatch = true;
          offset.matchIdx = previous ? numMatches - 1 : 0;
          this.updateMatch(true);
          return true;
        } else {
          // No matches, so attempt to search the next page.
          this.advanceOffsetPage(previous);
          if (offset.wrapped) {
            offset.matchIdx = null;
            if (this.pagesToSearch < 0) {
              // No point in wrapping again, there were no matches.
              this.updateMatch(false);
              // while matches were not found, searching for a page
              // with matches should nevertheless halt.
              return true;
            }
          }
          // Matches were not found (and searching is not done).
          return false;
        }
      },

      /**
       * The method is called back from the text layer when match presentation
       * is updated.
       * @param {number} pageIndex - page index.
       * @param {number} index - match index.
       * @param {Array} elements - text layer div elements array.
       * @param {number} beginIdx - start index of the div array for the match.
       * @param {number} endIdx - end index of the div array for the match.
       */
      updateMatchPosition: function PDFFindController_updateMatchPosition(
        pageIndex,
        index,
        elements,
        beginIdx,
        endIdx
      ) {
        if (
          this.selected.matchIdx === index &&
          this.selected.pageIdx === pageIndex
        ) {
          var spot = {
            top: FIND_SCROLL_OFFSET_TOP,
            left: FIND_SCROLL_OFFSET_LEFT
          };
          scrollIntoView(
            elements[beginIdx],
            spot,
            /* skipOverflowHiddenElements = */ true
          );
          this.updateUIState(FindStates.FIND_FOUND, this.state.previous);
        }
      },

      getCurrentMatchIndex: function PDFFindController_getCurrentMatchIndex() {
        if (!this.selected) {
          return 0;
        }
        return (
          this.pageMatchIndexStart[this.selected.pageIdx] +
          this.selected.matchIdx
        );
      },

      nextPageMatch: function PDFFindController_nextPageMatch() {
        if (this.resumePageIdx !== null) {
          console.error("There can only be one pending page.");
        }
        do {
          var pageIdx = this.offset.pageIdx;
          var matches = this.pageMatches[pageIdx];
          if (!matches) {
            // The matches don't exist yet for processing by "matchesReady",
            // so set a resume point for when they do exist.
            this.resumePageIdx = pageIdx;
            break;
          }
        } while (!this.matchesReady(matches));
      },

      advanceOffsetPage: function PDFFindController_advanceOffsetPage(
        previous
      ) {
        var offset = this.offset;
        var numPages = this.extractTextPromises.length;
        offset.pageIdx = previous ? offset.pageIdx - 1 : offset.pageIdx + 1;
        offset.matchIdx = null;

        this.pagesToSearch--;

        if (offset.pageIdx >= numPages || offset.pageIdx < 0) {
          offset.pageIdx = previous ? numPages - 1 : 0;
          offset.wrapped = true;
        }
      },

      updateMatch: function PDFFindController_updateMatch(found) {
        var state = FindStates.FIND_NOTFOUND;
        var wrapped = this.offset.wrapped;
        this.offset.wrapped = false;

        if (found) {
          var previousPage = this.selected.pageIdx;
          this.selected.pageIdx = this.offset.pageIdx;
          this.selected.matchIdx = this.offset.matchIdx;
          state = wrapped ? FindStates.FIND_WRAPPED : FindStates.FIND_FOUND;
          // Update the currently selected page to wipe out any selected matches.
          if (previousPage !== -1 && previousPage !== this.selected.pageIdx) {
            this.updatePage(previousPage);
          }
        }

        this.updateUIState(state, this.state.findPrevious);
        if (this.selected.pageIdx !== -1) {
          this.updatePage(this.selected.pageIdx);
        }
      },

      updateUIResultsCount: function PDFFindController_updateUIResultsCount() {
        if (this.onUpdateResultsCount) {
          this.onUpdateResultsCount(this.matchCount);
        }
      },

      updateUIState: function PDFFindController_updateUIState(state, previous) {
        if (this.onUpdateState) {
          this.onUpdateState(state, previous, this.matchCount);
        }
      }
    };
    return PDFFindController;
  })();

  /**
   * Creates a "search bar" given a set of DOM elements that act as controls
   * for searching or for setting search preferences in the UI. This object
   * also sets up the appropriate events for the controls. Actual searching
   * is done by PDFFindController.
   */
  var PDFFindBar = (function PDFFindBarClosure() {
    function PDFFindBar(options) {
      this.opened = false;
      this.bar = options.bar || null;
      this.toggleButton = options.toggleButton || null;
      this.findField = options.findField || null;
      this.highlightAll = options.highlightAllCheckbox || null;
      this.caseSensitive = options.caseSensitiveCheckbox || null;
      this.findMsg = options.findMsg || null;
      this.findSpinner = options.findSpinner || null;
      this.findStatusIcon = options.findStatusIcon || null;
      this.findPreviousButton = options.findPreviousButton || null;
      this.findNextButton = options.findNextButton || null;
      this.findController = options.findController || null;
      this.cntMatches = 0;

      if (this.findController === null) {
        throw new Error(
          "PDFFindBar cannot be used without a " + "PDFFindController instance."
        );
      }

      // Add event listeners to the DOM elements.
      var self = this;

      if (this.toggleButton) {
        // We modified this so we are able to have multiple toggle buttons
        this.toggleButton.forEach(function(toggleBtn) {
          toggleBtn.addEventListener("click", function() {
            self.toggle();
          });
        });
      }

      this.bar.addEventListener("keydown", function(evt) {
        switch (evt.keyCode) {
          case 13: // Enter
            if (evt.target === self.findField) {
              if (
                self.findField.value === (self.findController.state || {}).query
              ) {
                /*
                 * (JMK) Subsequent enter-presses should go to next instead of searching again.
                 * See task #61448
                 */
                self.curIndex++;
                self.updateStatusText();
                self.dispatchEvent("again", false);
                return;
              }

              self.curIndex = 1;
              self.dispatchEvent("", evt.shiftKey);
            }
            break;
          case 27: // Escape
            self.close();
            break;
        }
      });

      this.findPreviousButton.addEventListener("click", function() {
        self.curIndex--;
        self.updateStatusText();
        self.dispatchEvent("again", true);
      });

      this.findNextButton.addEventListener("click", function() {
        self.curIndex++;
        self.updateStatusText();
        self.dispatchEvent("again", false);
      });

      if (this.highlightAll) {
        this.highlightAll.addEventListener("click", function() {
          self.dispatchEvent("highlightallchange");
        });
      }

      if (this.caseSensitive) {
        this.caseSensitive.addEventListener("click", function() {
          self.dispatchEvent("casesensitivitychange");
        });
      }
    }

    PDFFindBar.prototype = {
      reset: function PDFFindBar_reset() {
        this.updateUIState();
      },

      dispatchEvent: function PDFFindBar_dispatchEvent(type, findPrev) {
        var detail = {
          query: this.findField.value,
          caseSensitive: this.caseSensitive
            ? this.caseSensitive.checked
            : false,
          highlightAll: this.highlightAll ? this.highlightAll.checked : true,
          findPrevious: findPrev
        };

        this.findController.executeCommand("find" + type, detail);
        //var event = document.createEvent('CustomEvent');
        //event.initCustomEvent("find" + type,
        //    true,
        //    true,
        //    detail);
        //return window.dispatchEvent(event);
      },

      updateUIState: function PDFFindBar_updateUIState(
        state,
        previous,
        matchCount
      ) {
        var findMsg = "";
        var searching = false;

        switch (state) {
          case FindStates.FIND_FOUND:
            break;

          case FindStates.FIND_PENDING:
            searching = true;
            break;

          case FindStates.FIND_NOTFOUND:
            searching = false;
            this.cntMatches = 0;
            break;

          case FindStates.FIND_WRAPPED:
            if (previous) {
              this.curIndex = this.cntMatches;
            }
            break;
        }

        this.findField.setAttribute("data-status", status);
        this.findMsg.textContent = findMsg;
        if (searching) {
          this.findSpinner.classList.remove("hidden");
        } else {
          this.findSpinner.classList.add("hidden");
          this.updateResultsCount(matchCount);
        }
      },

      updateResultsCount: function(matchCount) {
        this.cntMatches = matchCount;
        this.updateStatusText();
      },

      updateStatusText: function() {
        var curIndex = this.findController.getCurrentMatchIndex() + 1;

        if (isNaN(curIndex)) {
          curIndex = 0;
        }

        // IE 10 fix - remove decimal numbers
        curIndex = curIndex.toLocaleString();
        this.cntMatches = this.cntMatches.toLocaleString();
        var decimalIndex = curIndex.indexOf(",");
        if (decimalIndex > -1) {
          curIndex = curIndex.substr(0, decimalIndex);
          this.cntMatches = this.cntMatches.substr(
            0,
            this.cntMatches.indexOf(",")
          );
        }

        this.findMsg.textContent = curIndex + "/" + this.cntMatches;
      },

      open: function PDFFindBar_open() {
        if (!this.opened) {
          this.opened = true;
          this.bar.classList.remove("hidden");
        }
        this.findField.select();
        this.findField.focus();
      },

      close: function PDFFindBar_close() {
        if (!this.opened) {
          return;
        }
        this.opened = false;
        this.bar.classList.add("hidden");

        // Bit hacky way to remove the word highlighting when closing the searchbox.
        // Tried "this.findController.reset()"" and "this.findController.active = false" but neither worked.
        this.findController.executeCommand("find", { query: "" });
      },

      toggle: function PDFFindBar_toggle() {
        if (this.opened) {
          this.close();
        } else {
          this.open();
        }
      }
    };
    return PDFFindBar;
  })();

  PDFJS.FindStates = FindStates;
  PDFJS.PDFFindController = PDFFindController;
  PDFJS.PDFFindBar = PDFFindBar;
}.call(typeof window === "undefined" ? this : window));
