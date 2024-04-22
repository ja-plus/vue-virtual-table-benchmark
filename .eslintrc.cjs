/** default js eslint config */
module.exports = {
  root: true, // ESLint 一旦发现配置文件中有 "root": true，它就会停止在父级目录中寻找。
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    parser: {
      js: 'espree',
      vue: 'vue-eslint-parser',
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['html', 'vue'],
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'plugin:prettier/recommended'],
  rules: {
    'prettier/prettier': 1,
    'prefer-const': 1, // 未重新赋值的变量自动转换成const
    // semi: [1, 'always'], // 使用分号结尾
    // 'no-unused-vars': 1,
    // 'no-debugger': 0,
    // 'no-console': 0,
    // 'space-infix-ops': 1, // 操作符周围空格 // prettier/recommended
    // 'arrow-spacing': 1, // 箭头函数空格 // prettier/recommended
    // 'keyword-spacing': 1, // 关键词空格// prettier/recommended
    // 'no-trailing-spaces': 1, // 禁止尾行空格// prettier/recommended
    // 'object-curly-spacing': [1, 'always'], // 大括号空格{_key: val_} //prettier/recommended
    // 'comma-spacing': 1, // 逗号后空格 //prettier/recommended
    'spaced-comment': 1, // 注释斜杠后空格
    // 'space-before-block': 0, // 块前空格 if()_{} //prettier/recommended
    // 'switch-colon-spacing': 1, // switch -> case 0:_{} //prettier/recommended
    // 'brace-style': 1, // 左大括号不另起一行 //prettier/recommended
    // 'block-spacing': 1, // function () {_aa()_} //prettier/recommended
    // 'key-spacing': 1, // 键值间空格 key:_val
    'new-cap': 1, // 构造函数首字母大写
    eqeqeq: 1, // 使用 ===
    'dot-notation': 1, // 强制使用.不用[]
    'no-new-object': 1, // 使用字面量创建对象 非new Object()
    'object-shorthand': 1, // 对象方法属性值缩写
    // 'prefer-destructuring':1, //使用解构赋值来获取属性值
  },
};
