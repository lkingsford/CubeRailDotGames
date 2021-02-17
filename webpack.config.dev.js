const CopyWebpackPlugin = require('copy-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')

const path = require('path');

module.exports = {
  entry: './client/app.ts',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: ["/node_modules/", "/server/"]
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist-client'),
  },
  devServer: {
      contentBase: 'dist-client',
      port: 3000
  },
  plugins: [
    new CopyWebpackPlugin({
        patterns: [
            { from: 'build/assets', to: 'assets' },
            { from: 'build/html/css', to: 'css'}
        ]
    }),
    new HTMLWebpackPlugin({
      template: 'build/html/index.html'
    })
  ]
};