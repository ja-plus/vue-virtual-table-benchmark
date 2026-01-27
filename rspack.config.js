const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const BundleAnalyzer = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
// const SpeedMeasurePlugin = require('speed-measure-webpack-plugin');
// const smp = new SpeedMeasurePlugin();

module.exports =
  /*  smp.wrap( */
  /** @import('webpack').Configuration */
  {
    stats: 'minimal',
    entry: {
      app: './src/app.js',
    },
    devtool: 'source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      compress: true,
      open: true,
    },
    resolve: {
      extensions: ['...', '.ts', '.json'], // 解析扩展。（当我们通过路导入文件，找不到改文件时，会尝试加入这些后缀继续寻找文件）
      alias: {
        '@': path.join(__dirname, 'src'), // 在项目中使用@符号代替src路径，导入文件路径更方便
      },
    },
    module: {
      rules: [
        {
          test: /\.jsx$/, // 一个匹配loaders所处理的文件的拓展名的正则表达式，这里用来匹配js和jsx文件（必须）
          exclude: /node_modules/, // 屏蔽不需要处理的文件（文件夹）（可选）
          loader: 'babel-loader', // loader的名称（必须）
        },
        {
          test: /\.m?(t|j)s$/,
          // exclude: /node_modules/,
          // loader: 'ts-loader',
          loader: 'builtin:swc-loader',
        },
        {
          test: /lit[\\/].*\.ts$/,
          loader: 'ts-loader',
        },
        {
          test: /\.svelte$/,
          loader: 'svelte-loader',
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
        inject: true, // true：默认值，script标签位于html文件的 body 底部
        hash: true, // 在打包的资源插入html会加上hash
        minify: {
          removeComments: true, // 去注释
          collapseWhitespace: true, // 压缩空格
          removeAttributeQuotes: true, // 去除属性 标签的 引号  例如 <p id="test" /> 输出 <p id=test/>
        },
      }),
      // new BundleAnalyzer(),
    ],
  };
/* ); */
