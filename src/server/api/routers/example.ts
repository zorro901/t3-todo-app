import { z } from "zod";
import { router, publicProcedure } from '~/server/api/trpc';

// プロシージャを持つルーターを定義します。
export const exampleRouter = router({
  hello: publicProcedure
    // zod によるバリデーションをかけています
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
});
