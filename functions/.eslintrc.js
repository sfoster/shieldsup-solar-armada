module.exports = {
  root: true,
  env: {
    es2020: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "max-len": ["error", { "code": 96 }],
    "indent": ["error", 2],
    "quotes": ["error", "double"],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": 0,
  },
};
