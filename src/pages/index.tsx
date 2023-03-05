/* eslint-disable @next/next/no-img-element */
import md5 from "md5";
import Head from "next/head";
import { useEffect, useRef } from "react";
import { api } from "~/utils/api";

export default function Home() {
  const ref = useRef<HTMLDivElement>(null);
  const messages = api.chat.getMessages.useQuery();
  const sendMessage = api.chat.sendMessage.useMutation();

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [messages.data?.length]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const message = formData.get("message");
    if (!message) return;
    e.currentTarget.reset();

    sendMessage.mutate(
      { text: message as string },
      {
        onSettled: () => {
          void messages.refetch();
        },
      }
    );
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
            {messages.data?.map((message) => (
              <div
                key={message.id}
                className="flex flex-row gap-3 border-b p-2"
              >
                {message.role === "user" ? (
                  <div className="flex w-full flex-shrink-0 flex-row items-center gap-4">
                    <img
                      className="h-10 w-10 rounded-full border"
                      src={`https://www.gravatar.com/avatar/${md5(
                        "user"
                      )}?d=robohash&f=y`}
                      alt="avatar"
                    />
                    <p className="text-center text-xs">{message.text}</p>
                  </div>
                ) : (
                  <div className="flex w-full flex-shrink-0 flex-row-reverse items-center justify-start gap-4">
                    <img
                      className="h-10 w-10 rounded-full border"
                      src={`https://www.gravatar.com/avatar/${md5(
                        "ai"
                      )}?d=robohash&f=y`}
                      alt="avatar"
                    />
                    <p className="text-center text-xs">{message.text}</p>
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
