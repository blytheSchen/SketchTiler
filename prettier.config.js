/**
 * If you have the Prettier VS Code extension installed it will use this config
 * If you install it, make sure to set Prettier as the default formatter in VS Code settings
 * @see https://prettier.io/docs/configuration
 * @see https://prettier.io/docs/options
 * @see https://prettier-config-generator.com
 */
const config = {
  arrowParens: "always",
  bracketSameLine: false,
  bracketSpacing: true,
  embeddedLanguageFormatting: "auto",
  endOfLine: "lf",
  experimentalOperatorPosition: "end",
  experimentalTernaries: true,
  htmlWhitespaceSensitivity: "css",
  insertPragma: false,
  objectWrap: "preserve",
  printWidth: 80,
  proseWrap: "preserve",
  quoteProps: "as-needed",
  rangeStart: 0,
  requirePragma: false,
  semi: true,
  singleAttributePerLine: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "all",
  useTabs: false,
};

// Though ESLint requires Node, we want to be able to use Prettier without needing it as well
// This is case someone ever wanted to use Prettier but not ESLint
// To do that, we must write this config file in CommonJS,
// However, ESLint was not configured to understand that for this project
// So we need the following line:
// eslint-disable-next-line no-undef
module.exports = config;
