/* eslint-disable @next/next/no-img-element */

import { type Message, type Room } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import md5 from "md5";
import { useEffect, useRef, useState } from "react";
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

export default function Admin() {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const rooms = api.chat.getRooms.useQuery();

  const room = rooms.data?.find((room) => room.id === selectedRoom);

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col px-4">
        <h1 className="text-xl font-bold">Admin</h1>
        <div className="mb-10 flex flex-1 flex-row border ">
          <div className="flex w-1/4 flex-col border-r pt-2">
            <h2 className="mb-3 text-center text-lg font-bold">Inbox</h2>
            <div>
              {rooms.data?.map((room) => (
                <div
                  role="button"
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className="flex cursor-pointer flex-row gap-3 border-b border-t p-2 hover:bg-gray-100"
                >
                  <div className="flex w-full flex-shrink-0 flex-row items-center gap-4">
                    <img
                      className="h-10 w-10 rounded-full border"
                      src={`https://www.gravatar.com/avatar/${md5(
                        room.name
                      )}?d=robohash&f=y`}
                      alt="avatar"
                    />
                    {room.name.split("-")[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {room && <RoomChat room={room} />}
        </div>
      </div>
    </main>
  );
}

const useChannel = (
  name: string,
  onMessage: (message: Message) => void,
  onAiMessage: (message: { content: string; role: string }) => void
) => {
  const channel = supabase.channel(name);

  channel.on("broadcast", { event: "message" }, (payload) => {
    const message = payload.payload as Message;
    onMessage(message);
  });

  channel.on("broadcast", { event: "ai-message" }, (payload) => {
    onAiMessage(payload.payload as { content: string; role: string });
  });

  channel.subscribe();
};

function RoomChat({ room }: { room: Room }) {
  const user = "admin";
  const ref = useRef<HTMLDivElement>(null);
  const messageQuery = api.chat.getMessages.useQuery({ roomId: room.id });
  const sendMessage = api.chat.sendMessage.useMutation();
  const messages = messageQuery.data || [];
  const [input, setInput] = useState("");

  useChannel(
    `chat:${room.name}`,
    () => {
      void messageQuery.refetch();
    },
    ({ content }) => {
      setInput(content);
    }
  );

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message");
    if (!message) return;
    e.currentTarget.reset();
    sendMessage.mutate({
      user: "admin",
      room: room.name,
      content: input,
      role: "assistant",
    });
    void messageQuery.refetch();
  };

  return (
    <div className="flex flex-1 flex-col pt-2">
      <h2 className="text-center text-lg font-bold">Chat</h2>
      <div ref={ref} className="flex-1 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-row gap-3 border-b p-2">
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="rounded bg-blue-500 p-2 text-white">
          Send
        </button>
      </form>
    </div>
  );
}
