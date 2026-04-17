/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 30000,
  testMatch: ['**/*.test.js'],
  reporters: [
    'default',
    ...(process.env.CI
      ? [['jest-junit', { outputDirectory: './reports', outputName: 'junit.xml' }]]
      : []),
  ],
};
