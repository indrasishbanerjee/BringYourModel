import rootConfig from "../../eslint.config.mjs";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...rootConfig,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
];
