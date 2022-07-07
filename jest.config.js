const config = {
  setupFilesAfterEnv: ["<rootDir>/jest-setup.ts"],
  moduleNameMapper: {
    "\\.(css|less)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif)$": "<rootDir>/src/__mocks__/fileMock.ts",
    "^state/(.*)$": "<rootDir>/src/state/$1",
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^actions/(.*)$": "<rootDir>/src/actions/$1",
  },
};
module.exports = config;
