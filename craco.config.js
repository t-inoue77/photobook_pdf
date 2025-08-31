const path = require('path');
const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add polyfills for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "zlib": require.resolve("browserify-zlib"),
        "crypto": require.resolve("crypto-browserify"),
        "fs": path.resolve(__dirname, 'src/fs-polyfill.js'),
        "path": require.resolve("path-browserify"),
        "util": require.resolve("util"),
        "os": require.resolve("os-browserify/browser"),
        "events": require.resolve("events"),
        "stream": require.resolve("stream-browserify"),
        "buffer": require.resolve("buffer"),
        "assert": require.resolve("assert"),
        "url": require.resolve("url"),
        "querystring": require.resolve("querystring"),
        "http": require.resolve("http-browserify"),
        "https": require.resolve("https-browserify"),
        "timers": require.resolve("timers-browserify"),
        "process": require.resolve("process/browser.js"),
      };

      // Add alias to replace problematic modules
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        "linebreak": path.resolve(__dirname, 'src/linebreak-mock.js'),
      };
      
      // Add global polyfills
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser.js',
        })
      );

      // Make sure global and globalThis are available
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
          'globalThis': 'globalThis',
        })
      );
      
      return webpackConfig;
    },
  },
};