import { Configuration, OpenAIApi } from "openai";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

const configuration = new Configuration({
  apiKey: process.env.OPEN_API,
});

const openai = new OpenAIApi(configuration);

// Potential system message object:
// const system = {
//   whoami: "customer agent",
//   company: "Bens",
//   industry: "online shoe retailer",
//   products: [
//     {
//       name: "red sneaker",
//       price: 12,
//       size: [9, 10, 11, 12],
//       stock: { available: false, backIn: "2 weeks" },
//     },
//     {
//       name: "brown oxford dress shoe",
//       price: 5,
//       size: [9, 10, 11, 12],
//       stock: { available: true, backIn: 0 },
//       sale: { available: true, discount: 50, endsIn: "2 weeks" },
//     },
//   ],
// };

const SYSTEM_MESSAGE = {
  role: "system",
  content:
    "You are a customer agent for a online shoe retailer called Bens. The retailer sells 2 type of shoes: a red sneaker costing $12 and a brown oxford dress shoe costing $5. Shoes are avaliable in sizes: 9, 10, 11 and 12. The red sneaker is out of stock but will be back in 2 weeks. There is a sale of the oxford dress shoe for 50% off.  You are talking to a customer.",
} as const;

export const chatRouter = createTRPCRouter({
  getMessages: publicProcedure.query(async () => {
    return await prisma.message.findMany();
  }),
  sendMessage: publicProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.message.create({
        data: {
          text: input.text,
          role: "user",
        },
      });

      const messages = await prisma.message.findMany();

      const chatHistory = messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.text,
      }));

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [SYSTEM_MESSAGE, ...chatHistory],
      });

      const aiMessage = completion.data.choices[0]?.message;

      if (!aiMessage) {
        throw new Error("No message from AI");
      }

      await prisma.message.create({
        data: {
          text: aiMessage.content,
          role: aiMessage.role,
        },
      });

      return true;
    }),
});
