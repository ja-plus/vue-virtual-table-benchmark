module.exports = {
  presets: [
    ['solid'],
    [
      '@babel/preset-env',
      {
        modules: false,
        useBuiltIns: 'entry', // webpack在使用usage配置时会出问题
        corejs: 3.21,
        targets: {
          chrome: 49,
        },
      },
    ],
    // '@babel/preset-react',
  ],
  plugins: [
    // [
    //   '@babel/plugin-transform-runtime',
    //   {
    //     corejs: 3,
    //   }
    // ]
    // "@babel/plugin-transform-arrow-functions",
    // "@babel/plugin-transform-exponentiation-operator",
  ],
};
