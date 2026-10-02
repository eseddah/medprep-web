'use client';
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { Check, Copy, LockKeyhole, MessageCircle, Pencil, Plus, Send, Trash2, Users, X } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useStore } from '@/lib/store';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  sender: { id: string; name: string; avatar?: string };
}

interface ChatRoom {
  id: string;
  name: string;
  description: string;
  memberCount: number | null;
  joined: boolean;
  isDiscoverable: boolean;
  inviteCode?: string;
  isSystem: boolean;
}

type Connection = 'connecting' | 'connected' | 'offline';
const LOUNGE_ID = 'study-lounge';
const DEFAULT_ROOM: ChatRoom = {
  id: LOUNGE_ID,
  name: 'Study Lounge',
  description: 'Open to all signed-in MedPrep students',
  memberCount: null,
  joined: true,
  isDiscoverable: true,
  isSystem: true,
};

export default function ChatPage() {
  const router = useRouter();
  const userId = useStore(state => state.user?._id || '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([DEFAULT_ROOM]);
  const [activeRoomId, setActiveRoomId] = useState(LOUNGE_ID);
  const [draft, setDraft] = useState('');
  const [connection, setConnection] = useState<Connection>('connecting');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState('');
  const [editedText, setEditedText] = useState('');
  const [messageActionId, setMessageActionId] = useState('');
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [discoverable, setDiscoverable] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const activeRoomRef = useRef(LOUNGE_ID);
  const socketRef = useRef<Socket | null>(null);
  const joinSocketRoomRef = useRef<(roomId: string) => void>(() => {});
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRoom = rooms.find(room => room.id === activeRoomId) || DEFAULT_ROOM;

  useEffect(() => {
    const token = localStorage.getItem('medprep_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const socketUrl = apiUrl.replace(/\/api\/?$/, '');
    const socket = io(socketUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    joinSocketRoomRef.current = roomId => {
      socket.emit('chat:join', { roomId }, (result: { ok: boolean; messages?: ChatMessage[]; error?: string }) => {
        if (roomId !== activeRoomRef.current) return;
        if (!result.ok) {
          setError(result.error || 'Could not open this group');
          setHistoryLoaded(true);
          return;
        }
        setMessages(result.messages || []);
        setHistoryLoaded(true);
        setError('');
      });
    };

    api.get('/chat/rooms').then(({ data }) => setRooms(data.rooms || [DEFAULT_ROOM])).catch(() => {
      setError('Could not load groups. Try refreshing the page.');
    });

    socket.on('connect', () => {
      setConnection('connected');
      setError('');
      joinSocketRoomRef.current(activeRoomRef.current);
    });

    socket.on('chat:new', (message: ChatMessage) => {
      if (message.roomId !== activeRoomRef.current) return;
      setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message]);
    });
    socket.on('chat:updated', (message: ChatMessage) => {
      if (message.roomId === activeRoomRef.current) {
        setMessages(previous => previous.map(item => item.id === message.id ? message : item));
      }
    });
    socket.on('chat:deleted', (event: { id: string; roomId: string }) => {
      if (event.roomId === activeRoomRef.current) {
        setMessages(previous => previous.filter(item => item.id !== event.id));
      }
    });
    socket.on('chat:members', (update: { roomId: string; memberCount: number }) => {
      setRooms(previous => previous.map(room => room.id === update.roomId ? { ...room, memberCount: update.memberCount } : room));
    });
    socket.on('disconnect', () => setConnection('offline'));
    socket.on('connect_error', (socketError: Error) => {
      setConnection('offline');
      setError(socketError.message.toLowerCase().includes('auth') ? 'Your session has expired. Sign in again to join the Study Lounge.' : 'Connection interrupted. Reconnecting…');
      if (socketError.message.toLowerCase().includes('auth')) router.replace('/login');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      joinSocketRoomRef.current = () => {};
    };
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const sendMessage = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    const socket = socketRef.current;
    if (!text || !socket?.connected || sending) return;

    setSending(true);
    socket.timeout(8000).emit('chat:send', { roomId: activeRoomId, text }, (timeoutError: Error | null, result: { ok: boolean; error?: string }) => {
      setSending(false);
      if (timeoutError) {
        toast.error('Message was not sent. Check your connection and try again.');
      } else if (!result.ok) {
        toast.error(result.error || 'Message could not be sent');
      } else {
        setDraft('');
      }
    });
  };

  const saveMessageEdit = (event: FormEvent) => {
    event.preventDefault();
    const text = editedText.trim();
    const socket = socketRef.current;
    if (!text || !socket?.connected || !editingMessageId || messageActionId) return;

    setMessageActionId(editingMessageId);
    socket.timeout(8000).emit('chat:edit', { roomId: activeRoomId, messageId: editingMessageId, text }, (timeoutError: Error | null, result: { ok: boolean; error?: string }) => {
      setMessageActionId('');
      if (timeoutError) toast.error('Message was not updated. Check your connection and try again.');
      else if (!result.ok) toast.error(result.error || 'Message could not be updated');
      else {
        setEditingMessageId('');
        toast.success('Message updated');
      }
    });
  };

  const deleteMessage = (message: ChatMessage) => {
    if (!window.confirm('Delete this message?')) return;
    const socket = socketRef.current;
    if (!socket?.connected || messageActionId) return;

    setMessageActionId(message.id);
    socket.timeout(8000).emit('chat:delete', { roomId: activeRoomId, messageId: message.id }, (timeoutError: Error | null, result: { ok: boolean; error?: string }) => {
      setMessageActionId('');
      if (timeoutError) toast.error('Message was not deleted. Check your connection and try again.');
      else if (!result.ok) toast.error(result.error || 'Message could not be deleted');
      else toast.success('Message deleted');
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const openRoom = (roomId: string) => {
    if (roomId === activeRoomRef.current) return;
    socketRef.current?.emit('chat:leave', { roomId: activeRoomRef.current });
    activeRoomRef.current = roomId;
    setActiveRoomId(roomId);
    setEditingMessageId('');
    setMessages([]);
    setHistoryLoaded(false);
    setError('');
    if (socketRef.current?.connected) joinSocketRoomRef.current(roomId);
  };

  const joinDiscoverableRoom = async (room: ChatRoom) => {
    try {
      const { data } = await api.post('/chat/rooms/join', { roomId: room.id });
      setRooms(previous => [data.room, ...previous.filter(item => item.id !== data.room.id)]);
      openRoom(data.room.id);
    } catch (joinError: any) {
      toast.error(joinError.response?.data?.error || 'Could not join group');
    }
  };

  const joinByCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!joinCode.trim()) return;
    try {
      const { data } = await api.post('/chat/rooms/join', { joinCode });
      setRooms(previous => [data.room, ...previous.filter(room => room.id !== data.room.id)]);
      setJoinCode('');
      openRoom(data.room.id);
    } catch (joinError: any) {
      toast.error(joinError.response?.data?.error || 'Invite code could not be used');
    }
  };

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const { data } = await api.post('/chat/rooms', { name: groupName, description: groupDescription, isDiscoverable: discoverable });
      setRooms(previous => [data.room, ...previous.filter(room => room.id !== data.room.id)]);
      setGroupName('');
      setGroupDescription('');
      setCreateOpen(false);
      openRoom(data.room.id);
      toast.success(discoverable ? 'Group created and listed for students' : `Group created · invite code ${data.room.inviteCode}`);
    } catch (createError: any) {
      toast.error(createError.response?.data?.error || 'Could not create group');
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Invite code copied');
    } catch {
      toast.error(`Invite code: ${code}`);
    }
  };

  return (
    <DashboardLayout title="Study Lounge" sub="Discover study groups or make one for your class">
      <div className="h-[calc(100dvh-170px)] min-h-[440px] max-h-[900px] overflow-hidden rounded-xl border border-border bg-surface shadow-sm grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:flex flex-col border-r border-border bg-surface2">
          <div className="p-5 border-b border-border">
            <p className="text-[11px] uppercase tracking-wide text-text3 mb-1">Your spaces</p>
            <h2 className="font-dm-serif text-[20px] text-text">Messages</h2>
          </div>
          <div className="p-3 space-y-2 overflow-y-auto">
            {rooms.map(room => (
              <div key={room.id} className={`rounded-lg border p-2.5 ${room.id === activeRoomId ? 'border-accent bg-surface' : 'border-transparent'}`}>
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={() => room.joined ? openRoom(room.id) : joinDiscoverableRoom(room)} className="flex flex-1 min-w-0 items-center gap-2.5 text-left" title={room.joined ? `Open ${room.name}` : `Join ${room.name}`}>
                    <span className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0"><MessageCircle size={17} aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold text-text truncate">{room.name}</span>
                      <span className="block text-[10px] text-text3 truncate">{room.joined ? `${room.memberCount ?? 'All'} members` : 'Discoverable group'}</span>
                    </span>
                  </button>
                  {room.joined && room.inviteCode && <button type="button" onClick={() => copyInviteCode(room.inviteCode!)} aria-label={`Copy invite code for ${room.name}`} title={`Invite code ${room.inviteCode}`} className="text-accent p-1 rounded hover:bg-surface2"><Copy size={14} /></button>}
                  {!room.joined && <button type="button" onClick={() => joinDiscoverableRoom(room)} className="text-[10px] font-semibold text-accent px-2 py-1 rounded-md border border-border2 hover:bg-surface2">Join</button>}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border p-3">
            <form onSubmit={joinByCode} className="space-y-2">
              <label htmlFor="invite-code" className="text-[11px] text-text3">Join with invite code</label>
              <div className="flex gap-1.5">
                <input id="invite-code" value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Enter code" className="min-w-0 w-full rounded-md border border-border2 bg-surface px-2.5 py-2 text-[11px] text-text placeholder:text-text3" />
                <button type="submit" className="rounded-md bg-accent px-2.5 text-[11px] font-semibold text-white">Join</button>
              </div>
            </form>
          </div>
          <div className="mt-auto border-t border-border p-4 flex gap-2.5">
            <LockKeyhole size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-text3">Only signed-in accounts can read or send messages. Your email address is not shown in chat.</p>
          </div>
        </aside>

        <section className="min-w-0 flex flex-col" aria-label="Study Lounge group chat">
          <header className="flex items-center justify-between gap-3 px-4 md:px-5 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-3 min-w-0">
              <span className="lg:hidden w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
                <MessageCircle size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-text truncate">{activeRoom.name}</h2>
                <p className="text-[11px] text-text3 truncate">{activeRoom.isSystem ? 'Shared with MedPrep students' : activeRoom.description || `${activeRoom.memberCount ?? 'Private'} members`}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {activeRoom.inviteCode && <button type="button" onClick={() => copyInviteCode(activeRoom.inviteCode!)} aria-label={`Copy invite code for ${activeRoom.name}`} title={`Copy invite code ${activeRoom.inviteCode}`} className="rounded-lg border border-border2 bg-surface2 p-2 text-accent hover:border-accent"><Copy size={15} aria-hidden="true" /></button>}
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-border2 bg-surface2 px-2.5 py-2 text-[11px] font-semibold text-text2 hover:border-accent hover:text-accent"><Plus size={15} aria-hidden="true" /><span className="hidden sm:inline">New group</span></button>
              <span className="inline-flex items-center gap-2 text-[11px] font-medium text-text2" role="status">
                <span className={`w-2 h-2 rounded-full ${connection === 'connected' ? 'bg-green' : connection === 'connecting' ? 'bg-amber' : 'bg-red'}`} />
                {connection === 'connected' ? 'Live' : connection === 'connecting' ? 'Connecting' : 'Reconnecting'}
              </span>
            </div>
          </header>

          <div className="lg:hidden flex items-center gap-2 overflow-x-auto border-b border-border bg-surface2 px-3 py-2">
            {rooms.map(room => (
              <button key={room.id} type="button" onClick={() => room.joined ? openRoom(room.id) : joinDiscoverableRoom(room)} className={`max-w-40 shrink-0 rounded-lg border px-3 py-2 text-[11px] font-medium truncate ${room.id === activeRoomId ? 'bg-accent text-white border-accent' : 'bg-surface text-text2 border-border2'}`}>{room.joined ? room.name : `Join · ${room.name}`}</button>
            ))}
          </div>
          <form onSubmit={joinByCode} className="lg:hidden flex items-center gap-2 border-b border-border bg-surface px-3 py-2">
            <label htmlFor="mobile-invite-code" className="sr-only">Join a private group with an invite code</label>
            <input id="mobile-invite-code" value={joinCode} onChange={event => setJoinCode(event.target.value)} placeholder="Join with invite code" className="min-w-0 flex-1 rounded-md border border-border2 bg-surface2 px-3 py-2 text-[11px] text-text placeholder:text-text3" />
            <button type="submit" disabled={!joinCode.trim()} className="rounded-md bg-accent px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50">Join</button>
          </form>

          {error && <p role="status" className="px-4 py-2 text-[12px] text-amber bg-amber/10 border-b border-border">{error}</p>}

          <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-6 py-5 space-y-3 bg-bg" aria-live="polite" aria-relevant="additions text">
            {historyLoaded && messages.length === 0 && (
              <div className="h-full min-h-48 flex flex-col items-center justify-center text-center px-5">
                <span className="w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-3">
                  <MessageCircle size={22} aria-hidden="true" />
                </span>
                <h3 className="text-[14px] font-semibold text-text mb-1">Start the conversation</h3>
                <p className="max-w-xs text-[12px] text-text3">Share a question, a study tip, or a useful explanation with the group.</p>
              </div>
            )}
            {!historyLoaded && connection === 'connected' && (
              <p className="text-center text-[12px] text-text3 py-6">Loading recent messages…</p>
            )}
            {messages.map(message => {
              const ownMessage = message.sender.id === userId;
              return (
                <article key={message.id} className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] md:max-w-[76%] min-w-[112px] rounded-xl px-3.5 py-2.5 shadow-sm ${ownMessage ? 'bg-accent text-white rounded-br-sm' : 'bg-surface border border-border2 text-text rounded-bl-sm'}`}>
                    {!ownMessage && <p className="text-[11px] font-semibold text-accent mb-1">{message.sender.name}</p>}
                    {editingMessageId === message.id ? (
                      <form onSubmit={saveMessageEdit} className="space-y-2">
                        <label className="sr-only" htmlFor={`edit-message-${message.id}`}>Edit message</label>
                        <textarea id={`edit-message-${message.id}`} value={editedText} onChange={event => setEditedText(event.target.value)} maxLength={2000} rows={3} className="w-full min-w-[200px] resize-y rounded-md border border-border2 bg-surface px-2.5 py-2 text-[13px] leading-relaxed text-text" autoFocus />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setEditingMessageId('')} aria-label="Cancel editing" title="Cancel editing" className="rounded-md p-1.5 text-text2 hover:bg-surface2"><X size={15} /></button>
                          <button type="submit" disabled={!editedText.trim() || messageActionId === message.id} aria-label="Save edited message" title="Save edited message" className="rounded-md p-1.5 text-accent hover:bg-surface2 disabled:opacity-50"><Check size={15} /></button>
                        </div>
                      </form>
                    ) : <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>}
                    <time dateTime={message.createdAt} className={`block text-right text-[10px] mt-1 ${ownMessage ? 'text-white/75' : 'text-text3'}`}>
                      {new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}
                    </time>
                    {ownMessage && editingMessageId !== message.id && (
                      <div className="mt-1 flex justify-end gap-1">
                        <button type="button" onClick={() => { setEditingMessageId(message.id); setEditedText(message.text); }} aria-label="Edit message" title="Edit message" disabled={Boolean(messageActionId)} className="rounded p-1 text-white/80 hover:bg-white/15 disabled:opacity-50"><Pencil size={13} aria-hidden="true" /></button>
                        <button type="button" onClick={() => deleteMessage(message)} aria-label="Delete message" title="Delete message" disabled={Boolean(messageActionId)} className="rounded p-1 text-white/80 hover:bg-white/15 disabled:opacity-50"><Trash2 size={13} aria-hidden="true" /></button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={sendMessage} className="flex items-end gap-2 p-3 md:p-4 border-t border-border bg-surface">
            <label className="sr-only" htmlFor="chat-message">Write a message</label>
            <textarea
              id="chat-message"
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              rows={1}
              placeholder="Write a message…"
              className="min-h-11 max-h-32 flex-1 resize-y rounded-lg border border-border2 bg-surface2 px-3.5 py-3 text-[13px] leading-relaxed text-text outline-none placeholder:text-text3 focus:border-accent"
              disabled={connection !== 'connected'}
            />
            <button type="submit" aria-label="Send message" title="Send message" disabled={!draft.trim() || sending || connection !== 'connected'} className="h-11 w-11 shrink-0 rounded-lg bg-accent text-white flex items-center justify-center transition-colors hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed">
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCreateOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-group-title" className="w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 id="create-group-title" className="font-dm-serif text-[22px] text-text">Create a group</h2>
                <p className="text-[12px] text-text3 mt-1">Start a private study chat or list it for discovery.</p>
              </div>
              <button type="button" onClick={() => setCreateOpen(false)} aria-label="Close create group dialog" className="rounded-md p-1.5 text-text2 hover:bg-surface2"><X size={18} /></button>
            </div>
            <form onSubmit={createGroup} className="space-y-3.5">
              <div>
                <label htmlFor="group-name" className="block text-[12px] font-medium text-text2 mb-1.5">Group name</label>
                <input id="group-name" value={groupName} onChange={event => setGroupName(event.target.value)} required minLength={2} maxLength={60} placeholder="e.g. KNUST Biochemistry 2027" className="w-full rounded-lg border border-border2 bg-surface2 px-3 py-2.5 text-[13px] text-text placeholder:text-text3" />
              </div>
              <div>
                <label htmlFor="group-description" className="block text-[12px] font-medium text-text2 mb-1.5">Description</label>
                <textarea id="group-description" value={groupDescription} onChange={event => setGroupDescription(event.target.value)} maxLength={240} rows={3} placeholder="What will your group study?" className="w-full resize-y rounded-lg border border-border2 bg-surface2 px-3 py-2.5 text-[13px] text-text placeholder:text-text3" />
              </div>
              <label className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                <input type="checkbox" checked={discoverable} onChange={event => setDiscoverable(event.target.checked)} className="mt-0.5 accent-[var(--accent)]" />
                <span>
                  <span className="block text-[12px] font-semibold text-text">List in Discover groups</span>
                  <span className="block text-[11px] text-text3 mt-0.5">Turn off to make it invite-code only.</span>
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-border2 px-3.5 py-2 text-[12px] font-medium text-text2">Cancel</button>
                <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-[12px] font-semibold text-white">Create group</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}