/* eslint-disable @next/next/no-img-element */
import { type Message } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import md5 from "md5";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";
import { api } from "~/utils/api";

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

const useChannel = (name: string, onMessage: (message: Message) => void) => {
  const channel = supabase.channel(name);

  channel.on("broadcast", { event: "message" }, (payload) => {
    const message = payload.payload as Message;
    onMessage(message);
  });

  channel.subscribe();

  return {
    sendMessage: (message: Message) => {
      return channel.send({
        type: "broadcast",
        event: "message",
        payload: message,
      });
    },
  };
};

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const [user] = useState<string>(v4());
  const [messages, setMessages] = useState<Message[]>([]);
  const sendMessage = api.chat.sendMessage.useMutation();

  useChannel(`chat:${user}`, (message) => {
    setMessages((messages) => [...messages, message]);
  });

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message");
    if (!message) return;
    e.currentTarget.reset();

    sendMessage.mutate({
      user,
      content: message as string,
      room: user,
      role: "user",
    });
  };

  return (
    <>
      <Head>
        <title>PowerAgent.ai</title>
        <meta
          name="description"
          content="Give your customer agents superpowers"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="mb-2 text-2xl font-bold">PowerAgent.ai</h1>

        <div className="flex h-[500px] w-[300px] flex-col border ">
          <div ref={ref} className="flex-1 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className="flex flex-row gap-3 border-b p-2"
              >
                {message.user === user ? (
                  <div className="flex w-full flex-shrink-0 flex-row items-center gap-4">
                    <img
                      className="h-10 w-10 rounded-full border"
                      src={`https://www.gravatar.com/avatar/${md5(
                        message.user
                      )}?d=robohash&f=y`}
                      alt="avatar"
                    />
                    <p className="text-center text-xs">{message.content}</p>
                  </div>
                ) : (
                  <div className="flex w-full flex-shrink-0 flex-row-reverse items-center justify-start gap-4">
                    <img
                      className="h-10 w-10 rounded-full border"
                      src={`https://www.gravatar.com/avatar/${md5(
                        message.user
                      )}?d=robohash&f=y`}
                      alt="avatar"
                    />
                    <p className="text-center text-xs">{message.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-shrink-0 flex-row gap-3 border-t bg-gray-100 p-2"
          >
            <input
              className="w-full rounded border p-2"
              placeholder="Type a message..."
              name="message"
            />
            <button
              type="submit"
              className="rounded bg-blue-500 p-2 text-white"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
