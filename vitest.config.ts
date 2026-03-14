import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: './vitest.setup.ts',
        exclude: ['**/node_modules/**', '**/e2e/**'],
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*'],
            exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
        },
        env: {
            // 测试环境变量 - 内联配置，不依赖 .env 文件
            OPENAI_API_KEY: 'sk-test-api-key',
            OPENAI_MODEL: 'gpt-4o',
            REQUEST_TIMEOUT_SECONDS: '180',
            MODEL_SUPPORTS_VISION: 'true',
            DATABASE_URL: ':memory:',
            DATA_DIR: './data',
            LOG_LEVEL: 'silent',
        },
    },
})
