import { initTRPC } from '@trpc/server';

// tRPC を作成して tRPC の初期化を行います。
// この操作はアプリケーションごとに1回だけ行う必要があります。
// tRPC のインスタンスが複数あってはいけません。
const t = initTRPC.create();

// tそのものではなく、t変数の特定のメソッドをエクスポートします。
export const router = t.router;
export const publicProcedure = t.procedure;
