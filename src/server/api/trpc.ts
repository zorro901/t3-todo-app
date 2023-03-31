/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

/**
 * 1. CONTEXT
 *
 * このセクションでは、バックエンドAPIで利用可能な「コンテキスト」を定義します。
 *
 * これらによって、データベースやセッションなど、リクエストを処理する際に必要なものにアクセスできます。
 */
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { type Session } from "next-auth";

import { getServerAuthSession } from "~/server/auth";
import { prisma } from "~/server/db";

type CreateContextOptions = {
  session: Session | null;
};

/**
 * このヘルパーは、tRPCコンテキストの "内部 "を生成します。これを使う必要がある場合は、以下のようにエクスポートします。
 * ここからが本題です。
 *
 * 必要なものの例
 * - Next.jsをモックする必要がないようにするためです。
 * - tRPCの`createSSGHelpers`で、req/resがない場合。
 *
 * @see https://create.t3.gg/en/usage/trpc#-serverapitrpcts
 */
const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    prisma,
  };
};

/**
 * これは、ルーターで使用する実際のコンテキストです。すべてのリクエストを処理するために使用されます。
 * tRPCエンドポイントを経由するものです。
 *
 * @see https://trpc.io/docs/context
 */
export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerAuthSession({ req, res });

  return createInnerTRPCContext({
    session,
  });
};

/**
 * 2. イニシャライゼーション
 *
 * ここで、tRPC APIが初期化され、コンテキストとトランスフォーマーが接続されます。
 * また、ZodErrorsを解析し、バックエンドの検証エラーによってプロシージャが失敗した場合に、
 * フロントエンドで型安全性を確保できるようにします。
 */
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * このようにして、tRPC APIに新しいルータやサブルータを作成します。でこれらをたくさんインポートする必要があります。
 * "/src/server/api/routers "ディレクトリです。
 */

/**
 * このように、tRPC APIで新しいルーターやサブルーターを作成することができます。
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Public (unauthenticated) procedure
 *
 * これは、tRPC APIの新しいクエリやミューテーションを構築するために使用するベースピースです。
 * これは、クエリを実行するユーザーが認可されていることを保証するものではありませんが、
 * ユーザーがログインしている場合は、ユーザーのセッションデータにアクセスすることができます。
 */
export const publicProcedure = t.procedure;

/** プロシージャを実行する前にユーザーがログインしていることを強制する再利用可能なミドルウェアです。 */
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Protected (authenticated) procedure
 *
 * クエリや突然変異をログインしているユーザーのみがアクセスできるようにしたい場合、これを使用します。
 * セッションが有効であることを確認し、`ctx.session.user`がNULLでないことを保証します。
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
