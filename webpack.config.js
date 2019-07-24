const path = require('path');

module.exports = {
  entry: './src-web/index.js',
  mode: 'development',
  devtool: 'inline-source-map',
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    modules: [path.resolve(__dirname, 'src-web'), 'node_modules'],
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    compress: true,
    hot: true,
    liveReload: true,
    open: true,
    openPage: 'index.dev.html',
    proxy: {
      '/compile': 'http://localhost:8888',
      '/file': 'http://localhost:8888',
      '/images': 'http://localhost:8888',
    },
  },
};
