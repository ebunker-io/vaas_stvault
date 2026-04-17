/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|module\\.css)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.afterEnv.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(viem)/)',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules_226/',
    '<rootDir>/node_modules_before_ecs_yarn/',
    '<rootDir>/node_modules_before_v1-wagmi/',
    '<rootDir>/node_modules_new/',
  ],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
}
