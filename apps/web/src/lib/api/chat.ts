import { apiFetch } from './client';

export interface ChatRoomBuyer {
  id: string;
  buyerId: string;
  shopId: string;
  lastMessageAt: string;
  shop: { id: string; name: string; slug: string; logoUrl: string | null; ownerId: string; isOpen: boolean };
  messages: { id: string; content: string; sentAt: string; senderId: string; readAt: string | null }[];
}

export interface ChatRoomSeller {
  id: string;
  buyerId: string;
  shopId: string;
  lastMessageAt: string;
  buyer: { id: string; fullName: string; avatarUrl: string | null };
  messages: { id: string; content: string; sentAt: string; senderId: string; readAt: string | null }[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  imageUrl: string | null;
  readAt: string | null;
  sentAt: string;
}

export const listChatRooms = <T = ChatRoomBuyer | ChatRoomSeller>(token: string) =>
  apiFetch<T[]>('/api/v1/chats/rooms', { token });

export const openRoom = (token: string, shopId: string) =>
  apiFetch<{ id: string }>('/api/v1/chats/rooms', {
    method: 'POST', token, body: JSON.stringify({ shopId }),
  });

export const getRoomMessages = (token: string, roomId: string) =>
  apiFetch<ChatMessage[]>(`/api/v1/chats/rooms/${roomId}/messages`, { token });

export const sendChatMessage = (token: string, roomId: string, body: { content: string; imageUrl?: string }) =>
  apiFetch<{ message: ChatMessage; autoReply: ChatMessage | null }>(
    `/api/v1/chats/rooms/${roomId}/messages`,
    { method: 'POST', token, body: JSON.stringify(body) },
  );

export const markRoomRead = (token: string, roomId: string) =>
  apiFetch(`/api/v1/chats/rooms/${roomId}/read`, { method: 'POST', token });
