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
    'no-underscore-dangle': 0,
    'import/prefer-default-export': 0,
    'class-methods-use-this': 0,
    'no-param-reassign': 0,
    'no-nested-ternary': 0,
    'no-unused-vars': 1,
  },
};
