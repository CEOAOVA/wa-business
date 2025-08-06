Approach
Supabase has a cool new feature — database broadcasts that allow us to implement something like messaging in realtime. We can trigger database broadcasts when data is inserted into tables, so that the user on the receiving end of the message gets the data, without having to poll the database for changes.

Setup
First I implemented a couple of tables, namely users , chats , and messages . The chats table has columns for user1_id and user2_id which are foreign keys to the users table. The messages table has columns sender_id and receiver_id which are foreign keys to users table, as well as chat_id which is a foreign key to the chats table, as well as the column for the actual message and created_at timestamp.

Zoom image will be displayed

Implementation
Enable Realtime
First I enabled realtime feature on the messages table in the UI.

Create Migration with Triggers and Trigger Functions
This is going to be really similar to the documentation.

I created a new migration with supabase migration new broadcast_messages , and added the following code:

DROP TRIGGER  IF EXISTS broadcast_messages_trigger ON public.messages;
DROP FUNCTION IF EXISTS public.broadcast_messages();

CREATE OR REPLACE FUNCTION public.broadcast_messages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  -- Send realtime broadcast to all clients listening on `chat:<chat_id>`
  -- NOTE: `broadcast_changes` automatically serialises NEW into JSON
  PERFORM realtime.broadcast_changes(
    'chat:' || NEW.chat_id,   -- topic
    'send',                   -- event
    'INSERT',                 -- operation
    'messages',               -- table
    'public',                 -- schema
    NEW,                      -- new record
    NULL                      -- old record (not relevant for INSERT)
  );

  RETURN NEW;
END;
$func$;

CREATE TRIGGER broadcast_messages_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_messages();
When a row is inserted into messages table, the above code runs the broadcast_messages function —which just broadcasts a message. The topic that the message is broadcasted to is called chat:<chat_id> . When a user sends a message (by doing an INSERT into the messages table), the user on the receiving end of the conversation gets a broadcast with the message that was sent, which saves us having to poll the data.

As per the docs, you’d need to allow authenticated users to receive broadcasts by creating a policy (I didn’t include it in my migration file as it already existed):

create policy "Authenticated users can receive broadcasts"
on "realtime"."messages"
for select
to authenticated
using ( true );
Implement list-messages Supabase Cloud Function
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/utils/supabaseAdmin.ts";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  chat_id: string;
  message: string;
  created_at: string;
}

interface MessagesResponse {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get("chatId");
  if (!chatId) {
    return new Response(JSON.stringify({ error: "Missing currentUserId query param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limit = parseInt(searchParams.get("limit") || "20");
  const cursor = searchParams.get("cursor"); // Timestamp as cursor for pagination

  let query = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: JSON.stringify(error) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Process the response to determine the next cursor
  let nextCursor = null;
  if (data && data.length === limit) {
    nextCursor = data[data.length - 1].created_at;
  }  

  const response: MessagesResponse = {
    data: data || [],
    nextCursor,
    hasMore: nextCursor !== null,
  };

  return new Response(
    JSON.stringify(response),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
});
Here the Message interface fields match the column names of the messages table. The MessagesResponse interface is used for cursor pagination, which is perfect for this use case (user will never have to jump to a specific page, they just scroll up the chat, which is typical chat behaviour).

Get Fedor Selenskiy’s stories in your inbox
Join Medium for free to get updates from this writer.

Enter your email
Subscribe
It’s important to return the messages in descending order, from newest to oldest:

let query = supabaseAdmin
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(limit);
Implement useFetchMessages Hook
I then updated the frontend to fetch already sent messages, by consuming the newly created list-messages cloud function with a hook:

import { useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useInfiniteQuery } from '@tanstack/react-query';

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  chat_id: string;
  message: string;
  created_at: string;
}

export interface MessagesResponse {
  data: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

const fetchMessagesFunc = async ({
  chatId,
  cursor,
}: {
  chatId: string;
  cursor?: string;
}): Promise<MessagesResponse> => {
  const { data, error } = await supabase.functions.invoke<MessagesResponse>(
    `list-messages?chatId=${chatId}&limit=30${cursor ? `&cursor=${cursor.replace('+', '%2b')}` : ''}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (error || !data) {
    throw new Error(`Error fetching chats: ${error.message}`);
  }

  return data;
};

export const useFetchMessages = (chatId: string) => {
  const queryKey = useMemo(() => ['messages', chatId], [chatId]);

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchMessagesFunc({
        chatId: chatId ?? '',
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: chatId !== null,
  });
};
The Message and MessagesResponse interfaces are identical to the ones in the cloud function. Here I’m also using react-query useInfiniteQuery hook to allow inifinite scroll.

Implement useSendMessage Hook
import { useMemo } from 'react';
import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/stores/authStore';
import { MessagesResponse } from './useFetchMessages';

export const useSendMessage = ({
  chat_id,
  receiver_id,
}: {
  chat_id: string;
  receiver_id: string;
}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const queryKey = useMemo(() => ['messages', chat_id], [chat_id]);

  return useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      if (!currentUser) {
        throw new Error('User is not authenticated');
      }

      const { error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id,
        chat_id,
        message,
      });

      if (error) throw error;
    },
    onMutate: ({ message }: { message: string }) => {
      const prevCache = queryClient.getQueryData<InfiniteData<MessagesResponse, unknown>>(queryKey);

      queryClient.setQueryData<InfiniteData<MessagesResponse, unknown>>(queryKey, (prevData) => {
        if (!prevData) return;

        const prevDataCopy: InfiniteData<MessagesResponse, unknown> = JSON.parse(
          JSON.stringify(prevData)
        );

        prevDataCopy.pages[0].data = [
          {
            id: '',
            sender_id: currentUser?.id || '',
            receiver_id,
            chat_id,
            message,
            created_at: new Date().toISOString(),
          },
          ...prevDataCopy.pages[0].data,
        ];

        return prevDataCopy;
      });

      return {
        prevCache,
      };
    },
    onError: (error: Error, _, context) => {
      toast.show({
        type: 'error',
        text1: 'Message sending failed',
        text2: error.message || 'Your message was not sent',
      });

      queryClient.setQueryData<InfiniteData<MessagesResponse, unknown>>(
        queryKey,
        context?.prevCache
      );
    },
    onSettled: async (_a, _b, _c, context) => {
      // maybe not necessary?
      await queryClient.invalidateQueries({ queryKey: queryKey });
      await queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};
Here I INSERT a message into the messages table (which triggers a broadcast for that chat). I do an optimistic update for this insertion (prepending it to existing messages, as is it most recent).

In the onSettled function, I invalidate the cache for the messages of the current chat:

await queryClient.invalidateQueries({ queryKey: queryKey });
Which refetches the messages from the database. To be honest, I’m not sure that’s even necessary, and it seems to be adding unnecessary reads.

As a side note, the following line is only there to refetch the chats, so that the current chat appears at the top of the list:

await queryClient.invalidateQueries({ queryKey: ['chats'] });
Implement useMessageListener Hook
Now that there are hooks for fetching messages and sending messages — the only thing left is to create a hook for receiving and parsing the database broadcasts.

import { supabase } from '@/lib/supabase';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { MessagesResponse } from './useFetchMessages';

interface MessageRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  chat_id: string;
  message: string;
  created_at: string;
}

interface MessagePayload {
  event: string;
  payload: {
    id: string;
    old_record: null | MessageRecord;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    record: MessageRecord;
    schema: string;
    table: string;
  };
  type: 'broadcast';
}

export default function useMessageListener({
  chat_id,
  currentUserId,
}: {
  chat_id: string;
  currentUserId: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['messages', chat_id], [chat_id]);

  useEffect(() => {
    if (!currentUserId) return;
    console.log('setup message listener for chat', { chat_id });

    const setupRealtimeListener = async () => {
      try {
        await supabase.realtime.setAuth();

        const channel = supabase
          .channel(`chat:${chat_id}`, {
            config: {
              broadcast: { self: true },
              private: true,
            },
          })
          .on('broadcast', { event: 'send' }, (message_payload: MessagePayload) => {
            console.log('received broadcast');

            const { payload: { record } } = message_payload;

            // if we sent that message, don't do anything as its already in the cache
            if (record.sender_id === currentUserId) return;

            // otherwise it was sent by other user, insert it into cache
            const { id, sender_id, receiver_id, chat_id, message, created_at } = record;

            queryClient.setQueryData<InfiniteData<MessagesResponse, unknown>>(
              queryKey,
              (prevData) => {
                if (!prevData) return;

                const prevDataCopy: InfiniteData<MessagesResponse, unknown> = JSON.parse(
                  JSON.stringify(prevData)
                );

                prevDataCopy.pages[0].data = [
                  {
                    id,
                    sender_id,
                    receiver_id,
                    chat_id,
                    message,
                    created_at,
                  },
                  ...prevDataCopy.pages[0].data,
                ];

                return prevDataCopy;
              }
            );
          })
          .subscribe((status) => {
            if (status !== 'SUBSCRIBED') {
              console.error(`channel:${chat_id} IS NOT SUBSCRIBED`);
              return null;
            }

            if (status === 'SUBSCRIBED') {
              console.log(`channel:${chat_id} IS SUBSCRIBED`);
            }
          });

        return () => {
          console.log('doing CLEANUP');
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error(`Error setting up realtime listener for chat:${chat_id}`, error);
      }
    };

    const cleanup = setupRealtimeListener();

    // Cleanup on unmount
    return () => {
      cleanup?.then((cleanupFn) => cleanupFn?.());
    };
  }, [chat_id, currentUserId]);
}
Again MessageRecord interface has fields that match the columns of the messages table. Here I’m inserting the broadcasted message into the react-query cache, which makes it display in the chat component.

Bringing It Together
export default function ChatDetailScreen({ chat_id, other_user_id }: { chat_id: string, other_user_id: string }) {
  const { currentUser } = useAuthStore();

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    fetchNextPage,
    fetchPreviousPage,
    hasNextPage,
  } = useFetchMessages(chat_id);

  const messages = useMemo(() => {
    if (!data?.pages) return [];
    return data.pages.slice().flatMap((page) => page.data);
  }, [data?.pages]);

  const { mutate } = useSendMessage({ chat_id, receiver_id: other_user_id });

  useMessageListener({ chat_id, currentUserId: currentUser?.id || '' });

  return (
    <div className="flex-1">
      <MessageList
        messages={messages}
        currentUserId={currentUser?.id || ''}
        {...{
          isLoading,
          isError,
          isFetchingNextPage,
          fetchNextPage,
          fetchPreviousPage,
          hasNextPage,
        }}
      />
      <MessageInput onSend={(message) => mutate({ message })} isSending={false} />
    </div>
  );
}
This is the component that displays the chat itself and allows the users to communicate. Here MessageList is a component that renders the messages in bubbles (on the left side of the screen if the current user is the receiver, and on the right side if they’re the sender), and MessageInput is a component that allows the user to type in their message in an input and click the send button to send it.