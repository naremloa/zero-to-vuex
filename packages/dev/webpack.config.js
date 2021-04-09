const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const resolve = (...p) => path.resolve(__dirname, ...p);

module.exports = {
  mode: 'development',
  entry: {
    main: resolve('src/index.ts'),
  },
  output: {
    path: resolve("dist"),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      }
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve('src/index.html'),
    })
  ],
  devServer: {
    port: 8888,
  }
}