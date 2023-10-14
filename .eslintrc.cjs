/* eslint-env node */
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'airbnb', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    curly: [2, 'all'],
    'import/extensions': 'off',
    'import/no-cycle': [2, { ignoreExternal: true }],
    'import/no-named-as-default-member': 'off',
    'import/no-named-as-default': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'no-console': [
      'error',
      {
        allow: ['warn', 'error']
      }
    ],
    'no-shadow': 'off',
    'no-unused-vars': 'off',
    'no-useless-constructor': 'off',
    'no-use-before-define': 'off',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    '@typescript-eslint/no-useless-constructor': 'error'
  },
  ignorePatterns: ['node_modules/*', 'dist/*', 'cleanup.js']
}
