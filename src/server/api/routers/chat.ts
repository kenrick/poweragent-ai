import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prisma } from "~/server/db";

const configuration = new Configuration({
  apiKey: process.env.OPEN_API,
});

const openai = new OpenAIApi(configuration);

const supabase = createClient(
  "https://unngvkuphkfvdvdmymdd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVubmd2a3VwaGtmdmR2ZG15bWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzgwNjkyOTMsImV4cCI6MTk5MzY0NTI5M30.knonEySLcCjjgKD1u-IicbgjNQc1rMwjIfDtc9Rnh1Y",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

const SYSTEM_MESSAGE = {
  role: "system",
  content:
    "You are a customer agent for a online shoe retailer called Bens. The retailer sells 2 type of shoes: a red sneaker costing $12 and a brown oxford dress shoe costing $5. Shoes are avaliable in sizes: 9, 10, 11 and 12. The red sneaker is out of stock but will be back in 2 weeks. There is a sale of the oxford dress shoe for 50% off.  You are talking to a customer.",
} as const;

export const chatRouter = createTRPCRouter({
  getMessages: publicProcedure
    .input(
      z.object({
        roomId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await prisma.message.findMany({ where: { roomId: input.roomId } });
    }),
  getRooms: publicProcedure.query(async () => {
    return await prisma.room.findMany();
  }),
  sendMessage: publicProcedure
    .input(
      z.object({
        content: z.string(),
        user: z.string(),
        room: z.string(),
        role: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const room = await prisma.room.upsert({
        where: {
          name: input.room,
        },
        update: {},
        create: {
          name: input.room,
        },
      });

      const message = await prisma.message.create({
        data: {
          user: input.user,
          roomId: room.id,
          content: input.content,
          role: input.role,
        },
      });

      const channel = supabase.channel(`chat:${room.name}`).subscribe();
      await channel.send({
        type: "broadcast",
        event: "message",
        payload: message,
      });

      const messages = await prisma.message.findMany();
      const chatHistory = messages.map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content,
      }));

      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [SYSTEM_MESSAGE, ...chatHistory],
      });

      const aiMessage = completion.data.choices[0]?.message;

      if (!aiMessage) {
        throw new Error("No message from AI");
      }

      await channel.send({
        type: "broadcast",
        event: "ai-message",
        payload: aiMessage,
      });

      return true;
    }),
});
