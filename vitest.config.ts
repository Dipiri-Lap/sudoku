/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react() as any],
    test: {
        environment: 'node',
        globals: true,
        // 3매치 엔진 테스트는 한 파일이 수천 판을 시뮬레이션한다. 워커를 많이
        // 띄우면 각자 그 부하를 지고 메모리로 죽는다(Worker exited unexpectedly).
        // Vitest 4에서 poolOptions가 최상위 옵션으로 바뀌었다.
        maxWorkers: 2,
    },
})
