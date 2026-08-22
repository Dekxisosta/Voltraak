module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    'coverage',
    '.eslintrc.cjs',
    'vite.config.js',
    'vitest.config.js',
    'tailwind.config.js',
    'postcss.config.js',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    requireConfigFile: false,
    ecmaFeatures: { jsx: true },
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
  },
  settings: {
    react: { version: '18.2' },
    'import/resolver': {
      alias: {
        map: [
          ['@/shared', './src/shared'],
          ['@/services', './src/shared/services'],
          ['@/components/common', './src/shared/components/common'],
          ['@/components/layout', './src/shared/components/layout'],
          ['@/components', './src/shared/components'],
          ['@/hooks', './src/shared/hooks'],
          ['@/api', './src/shared/api'],
          ['@/utils', './src/shared/utils'],
          ['@/contexts', './src/shared/contexts'],
          ['@/pages', './src/pages'],
          ['@/styles', './src/styles'],
          ['@/routes', './src/routes'],
          ['@/features', './src/features'],
          ['@/test', './src/test'],
          ['@', './src'],
        ],
        extensions: ['.js', '.jsx', '.json'],
      },
      node: {
        extensions: ['.js', '.jsx', '.json'],
      },
    },
  },
  plugins: ['react-refresh', 'unused-imports', 'import', 'react'],
  rules: {
    // Detect unused imports (auto-fixable)
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    // Turn off ESLint's own no-unused-vars in favor of unused-imports
    'no-unused-vars': 'off',

    // Detect imports pointing to non-existent files/modules
    'import/no-unresolved': ['error', { commonjs: true, caseSensitive: false }],
    'import/named': 'off',
    'import/default': 'off',
    'import/namespace': 'off',
    'import/no-duplicates': 'error',
    'import/no-named-as-default': 'off',
    'import/no-named-as-default-member': 'off',

    // React-specific
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
    'react-refresh/only-export-components': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
      env: { jest: true, node: true },
      globals: {
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      rules: {
        'import/no-unresolved': 'off',
      },
    },
    {
      files: ['src/test/setup.js', 'src/__tests__/**/*'],
      rules: {
        'unused-imports/no-unused-vars': 'off',
      },
    },
  ],
}
