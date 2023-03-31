import { router } from '~/server/api/trpc';

import { exampleRouter } from '~/server/api/routers/example';

// 定義したルータをサーバのプライマリルーターに渡す。
const appRouter = router({
  example: exampleRouter,
});

// API の型定義をエクスポートする
export type AppRouter = typeof appRouter;
