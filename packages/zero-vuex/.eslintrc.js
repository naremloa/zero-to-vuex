const path = require('path');

module.exports = {
  root: true,
  parser: '@babel/eslint-parser',
  parserOptions: {
    babelOptions: {
      configFile: path.resolve(__dirname, 'babel.config.js'),
    },
  },
  extends: [
    'eslint:recommended',
    'airbnb-base',
  ],
  env: {
    browser: true,
    node: true,
  },
  rules: {
    'no-console': ['error', { allow: ['warn', 'error', 'group', 'info'] }],
  },
};
