const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = {
  stats: 'minimal',
  entry: {
    app: './src/app.js',
  },
  // 开发环境使用更快的 cheap-module-source-map，构建使用完整的 source-map
  devtool: isDev ? 'cheap-module-source-map' : 'source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    open: true,
    hot: true,
  },
  resolve: {
    extensions: ['...', '.json'],
    alias: {
      '@': path.join(__dirname, 'src'),
    },
  },
  // 开发环境启用懒编译，只编译当前页面需要的模块，大幅减少首次构建时间
  experiments: {
    lazyCompilation: isDev ? { imports: true, entries: false } : false,
  },
  // 优化 tree-shaking，减少产物体积和构建时间
  optimization: {
    sideEffects: true,
    usedExports: true,
    providedExports: true,
    innerGraph: true,
  },
  // 减少 node_modules 的文件监听开销
  snapshot: {
    managedPaths: [path.resolve(__dirname, 'node_modules')],
  },
  module: {
    rules: [
      {
        test: /\.m?(t|j)s$/,
        loader: 'builtin:swc-loader',
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html',
      inject: true,
      hash: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
      },
    }),
  ],
};
