const path = require('path');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: path.resolve(__dirname, 'tsconfig.json'),
  },
  extends: [
    "airbnb-typescript/base"
  ],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'import/prefer-default-export': 0,
    'no-param-reassign': 0,
  }
}