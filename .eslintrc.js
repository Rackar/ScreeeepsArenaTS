module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript"
  ],
  ignorePatterns: ["exported-game-constants.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    sourceType: "module"
  },
  plugins: ["@typescript-eslint", "import"],
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"]
    },
    "import/resolver": {
      typescript: {}
    },
    "import/core-modules": [
      "game",
      "game/prototypes",
      "game/utils",
      "game/path-finder",
      "game/constants",
      "game/visual",
      "arena",
      "arena/prototypes",
      "arena/constants"
    ] // https://github.com/benmosher/eslint-plugin-import/blob/v2.22.1/README.md#importcore-modules
  },
  rules: {
    "@typescript-eslint/array-type": "error",
    "@typescript-eslint/consistent-type-assertions": "error",
    "@typescript-eslint/consistent-type-definitions": "error",
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "explicit"
      }
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-expressions": "error",
    "@typescript-eslint/no-use-before-define": ["error", { functions: false }],
    "@typescript-eslint/prefer-for-of": "error",
    "@typescript-eslint/unified-signatures": "error",
    // "@typescript-eslint/no-unsafe-assignment": "warn",
    // "@typescript-eslint/no-unsafe-call": "warn",
    // "@typescript-eslint/no-unsafe-member-access": "warn",
    camelcase: "error",
    "@typescript-eslint/dot-notation": "error",
    eqeqeq: ["error", "smart"],
    "id-denylist": ["error", "any", "Number", "number", "String", "string", "Boolean", "boolean", "Undefined"],
    "id-match": "error",
    "max-classes-per-file": ["error", 1],
    "no-bitwise": "error",
    "no-caller": "error",
    "no-eval": "error",
    "no-new-wrappers": "error",
    "@typescript-eslint/no-shadow": [
      "error",
      {
        hoist: "all"
      }
    ],
    "@typescript-eslint/no-throw-literal": "error",

    radix: "error",

    "spaced-comment": "error",
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    //if后必须加花括号
    curly: 1,
    //禁止条件表达式中出现赋值操作符
    'no-cond-assign': 1,
    //箭头函数括号适时省略
    'arrow-parens': [1, 'as-needed'],
    //不允许var，用let const代替
    'no-var': 1,
    // 能用const时不用let

    'prefer-const': 1,
    // 每个变量定义需要单独行
    'one-var': [1, 'never'],

    // 不允许定义未使用
    'no-unused-vars': 1,
    //对象属性使用点而不是方括号
    // 'dot-notation': 1,

    // 屏蔽无必要的字符串相加
    'no-useless-concat': 'warn',

    // 字符串使用字面量而不是加号连接
    'prefer-template': 'warn',

    // 不允许空函数体
    'no-empty': 'warn',

    // 块末插入空行
    'padding-line-between-statements': [
      'warn',
      { blankLine: 'always', prev: 'block-like', next: '*' },
    ],

    //尽量使用对象简写
    'object-shorthand': ['warn', 'always', { ignoreConstructors: true }],

    // 回调函数必须使用箭头函数
    'prefer-arrow-callback': 'warn',

    // 尽量使用对象解构赋值
    'prefer-destructuring': [
      'warn',
      {
        object: true,
      },
      {
        enforceForRenamedProperties: false,
      },
    ],

    //禁止在循环中声明函数
    'no-loop-func': 'warn',

    //禁止循环中出现await。应使用await Promise.all(results)将promise集合并行处理
    'no-await-in-loop': 'warn',
  }
};
