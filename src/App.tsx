import { LegacyPdfViewer } from "./pdf/LegacyPdfViewer";
import React from "react";

const App: React.FC = () => {
  return (
    <>
      <div>Test</div>
      <LegacyPdfViewer
        url={"http://localhost:3044/public/images/fbm151227814.pdf"}
      />
    </>
  );
};

export default App;
