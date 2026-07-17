"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  Send,
  Megaphone,
  User as UserIcon,
  RefreshCw,
  MoreHorizontal,
  Pencil,
  Trash2,
  CornerUpRight,
  Undo2,
  Check,
  X,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleBadge, Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { CLASSIFICATIONS, CLASSIFICATION_META, type Classification } from "@/lib/constants";

type Contact = { id: string; fullName: string; rank: string | null; unit: string | null; role: string };
type Attachment = { name: string; type: string; size: number; dataUrl: string };
type Message = {
  id: string;
  senderId: string;
  senderName: string;
  recipientId: string | null;
  body: string;
  read: boolean;
  editedAt?: string | null;
  attachments?: string;
  classification?: string;
  createdAt: string;
};

const BROADCAST = "__broadcast__";

export function MessagingCenter({ isAdmin }: { isAdmin: boolean }) {
  const { push } = useToast();
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [me, setMe] = React.useState("");
  const [selected, setSelected] = React.useState<string>(BROADCAST);
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState("");
  const [forwardMsg, setForwardMsg] = React.useState<Message | null>(null);
  const [pendingFiles, setPendingFiles] = React.useState<Attachment[]>([]);
  const [classification, setClassification] = React.useState<Classification>("UNCLASSIFIED");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const MAX_FILE = 4 * 1024 * 1024; // 4 MB per file

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (f.size > MAX_FILE) {
        push({ kind: "error", title: "File too large", message: `${f.name} exceeds 4 MB` });
        continue;
      }
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      });
      setPendingFiles((prev) => [...prev, { name: f.name, type: f.type, size: f.size, dataUrl }].slice(0, 5));
    }
  }

  const within1hr = (m: Message) => Date.now() - new Date(m.createdAt).getTime() < 3600_000;

  async function msgAction(id: string, action: "edit" | "unsend" | "delete", extra?: object) {
    const res = await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) {
      push({ kind: "error", title: "Action failed", message: data.error });
      return null;
    }
    return data;
  }

  async function saveEdit(m: Message) {
    if (!editText.trim()) return;
    const data = await msgAction(m.id, "edit", { body: editText });
    if (data) {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? data.message : x)));
      setEditingId(null);
    }
  }
  async function unsend(m: Message) {
    if (!confirm("Unsend this message for everyone?")) return;
    if (await msgAction(m.id, "unsend")) {
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
      push({ kind: "success", title: "Message unsent" });
    }
    setMenuFor(null);
  }
  async function removeForMe(m: Message) {
    if (await msgAction(m.id, "delete")) setMessages((prev) => prev.filter((x) => x.id !== m.id));
    setMenuFor(null);
  }
  async function forwardTo(contactId: string) {
    if (!forwardMsg) return;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: contactId, body: forwardMsg.body }),
    });
    if (res.ok) {
      push({ kind: "success", title: "Message forwarded" });
      load();
    } else {
      push({ kind: "error", title: "Forward failed" });
    }
    setForwardMsg(null);
  }

  const load = React.useCallback(async () => {
    const res = await fetch("/api/messages");
    if (!res.ok) return;
    const data = await res.json();
    setContacts(data.contacts);
    setMessages(data.messages);
    setMe(data.me);
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 20000); // light polling for new messages
    return () => clearInterval(t);
  }, [load]);

  // Mark a direct thread read when opened.
  React.useEffect(() => {
    if (selected === BROADCAST || !me) return;
    const hasUnread = messages.some((m) => m.senderId === selected && m.recipientId === me && !m.read);
    if (hasUnread) {
      fetch("/api/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: selected }),
      }).then(() =>
        setMessages((prev) =>
          prev.map((m) => (m.senderId === selected && m.recipientId === me ? { ...m, read: true } : m)),
        ),
      );
    }
  }, [selected, me, messages]);

  const thread = messages.filter((m) =>
    selected === BROADCAST
      ? m.recipientId === null
      : (m.senderId === me && m.recipientId === selected) ||
        (m.senderId === selected && m.recipientId === me),
  );

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, selected]);

  const unreadFrom = (contactId: string) =>
    messages.filter((m) => m.senderId === contactId && m.recipientId === me && !m.read).length;

  const canSend = selected !== BROADCAST || isAdmin;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && pendingFiles.length === 0) return;
    setSending(true);
    const recipientId = selected === BROADCAST ? null : selected;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId, body, classification, attachments: pendingFiles }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) return push({ kind: "error", title: "Send failed", message: data.error });
    setMessages((prev) => [...prev, data.message]);
    setBody("");
    setPendingFiles([]);
  }

  const selectedContact = contacts.find((c) => c.id === selected);

  return (
    <div className="panel grid h-[calc(100vh-11rem)] grid-cols-1 overflow-hidden md:grid-cols-[280px_1fr]">
      {/* Thread list */}
      <div className="flex flex-col border-b border-white/8 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversations</span>
          <button onClick={load} className="text-slate-500 hover:text-sky-300" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
          <button
            onClick={() => setSelected(BROADCAST)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
              selected === BROADCAST ? "bg-sky-500/10 text-sky-200" : "text-slate-300 hover:bg-white/5",
            )}
          >
            <Megaphone className="h-4 w-4 shrink-0 text-amber-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium">Broadcasts</p>
              <p className="truncate text-[0.68rem] text-slate-500">Command-wide announcements</p>
            </div>
          </button>

          {contacts.map((c) => {
            const unread = unreadFrom(c.id);
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                  selected === c.id ? "bg-sky-500/10 text-sky-200" : "text-slate-300 hover:bg-white/5",
                )}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy-700 text-xs font-bold text-sky-300">
                  {c.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.fullName}</p>
                  <p className="truncate text-[0.68rem] text-slate-500">{c.unit ?? c.role}</p>
                </div>
                {unread > 0 && (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-sky-500 px-1 text-[0.62rem] font-bold text-navy-950">
                    {unread}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex min-h-0 flex-col">
        <div className="flex items-center gap-3 border-b border-white/8 px-5 py-3">
          {selected === BROADCAST ? (
            <>
              <Megaphone className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">Broadcasts</p>
                <p className="text-[0.68rem] text-slate-500">
                  {isAdmin ? "You can broadcast to all personnel" : "Command-wide announcements (read-only)"}
                </p>
              </div>
            </>
          ) : selectedContact ? (
            <>
              <UserIcon className="h-4 w-4 text-sky-400" />
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-100">
                  {selectedContact.rank ? `${selectedContact.rank} ` : ""}
                  {selectedContact.fullName}
                </p>
                <RoleBadge role={selectedContact.role} />
              </div>
            </>
          ) : null}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
          {thread.length === 0 && (
            <p className="mt-10 text-center text-sm text-slate-500">No messages yet. Start the conversation.</p>
          )}
          {thread.map((m) => {
            const mine = m.senderId === me;
            const editing = editingId === m.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("group flex flex-col", mine ? "items-end" : "items-start")}
              >
                {!mine && selected === BROADCAST && (
                  <span className="mb-0.5 text-[0.66rem] text-slate-500">{m.senderName}</span>
                )}

                {editing ? (
                  <div className="flex w-full max-w-[80%] items-center gap-1.5">
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(m)}
                      className="flex-1 rounded-lg border border-white/15 bg-navy-950/60 px-2.5 py-1.5 text-sm text-slate-100 focus:border-sky-500/40 focus:outline-none"
                    />
                    <button onClick={() => saveEdit(m)} className="text-sky-400 hover:text-sky-300" title="Save">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300" title="Cancel">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className={cn("flex items-center gap-1", mine && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm",
                        mine
                          ? "rounded-br-sm bg-sky-500/90 text-navy-950"
                          : "rounded-bl-sm border border-white/10 bg-navy-800 text-slate-100",
                      )}
                    >
                      {m.classification && m.classification !== "UNCLASSIFIED" && (
                        <div className="mb-1">
                          <Badge tone={CLASSIFICATION_META[m.classification as Classification]?.tone}>
                            {CLASSIFICATION_META[m.classification as Classification]?.label ?? m.classification}
                          </Badge>
                        </div>
                      )}
                      {m.body && <div>{m.body}</div>}
                      <Attachments raw={m.attachments} />
                    </div>

                    {/* actions */}
                    <div className="relative opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                        className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-white/10 hover:text-slate-200"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuFor === m.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                          <div className={cn("panel absolute z-20 mt-1 w-40 p-1", mine ? "right-0" : "left-0")}>
                            {mine && within1hr(m) && (
                              <button
                                onClick={() => {
                                  setEditingId(m.id);
                                  setEditText(m.body);
                                  setMenuFor(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                            )}
                            {mine && (
                              <button
                                onClick={() => unsend(m)}
                                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                              >
                                <Undo2 className="h-3.5 w-3.5" /> Unsend
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setForwardMsg(m);
                                setMenuFor(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                            >
                              <CornerUpRight className="h-3.5 w-3.5" /> Forward
                            </button>
                            <button
                              onClick={() => removeForMe(m)}
                              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete for me
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <span className="mt-1 text-[0.62rem] text-slate-600">
                  {timeAgo(m.createdAt)}
                  {m.editedAt ? " · edited" : ""}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Forward picker */}
        <Modal open={!!forwardMsg} onClose={() => setForwardMsg(null)} title="Forward message" className="max-w-sm">
          {forwardMsg && (
            <div className="space-y-3">
              <div className="rounded-lg border border-white/10 bg-navy-950/40 p-2.5 text-sm text-slate-300">
                {forwardMsg.body}
              </div>
              <p className="text-[0.7rem] uppercase tracking-wider text-slate-500">Forward to</p>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => forwardTo(c.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/5"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-navy-700 text-xs font-bold text-sky-300">
                      {c.fullName.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    </span>
                    <span className="text-sm text-slate-200">{c.fullName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Modal>

        <div className="border-t border-white/8 p-3">
          {/* pending attachments */}
          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-navy-950/60 px-2 py-1 text-[0.7rem] text-slate-300">
                  <FileText className="h-3 w-3 text-sky-400" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setPendingFiles((p) => p.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-300">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={send} className="flex items-center gap-2">
            {/* classification */}
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value as Classification)}
              disabled={!canSend}
              title="Message classification"
              className="h-10 shrink-0 rounded-lg border border-white/10 bg-navy-950/60 px-2 text-xs text-slate-200 focus:border-sky-500/40 focus:outline-none disabled:opacity-50"
            >
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>{CLASSIFICATION_META[c].label}</option>
              ))}
            </select>

            {/* attach */}
            <input ref={fileRef} type="file" multiple hidden onChange={onFilesPicked} accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" />
            <button
              type="button"
              disabled={!canSend}
              onClick={() => fileRef.current?.click()}
              title="Attach images, videos, files"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-sky-300 disabled:opacity-50"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={!canSend}
              placeholder={
                canSend
                  ? selected === BROADCAST
                    ? "Broadcast a message to everyone…"
                    : "Type a message…"
                  : "Only administrators can broadcast"
              }
              className="h-10 flex-1 rounded-lg border border-white/10 bg-navy-950/60 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-500/40 focus:outline-none disabled:opacity-50"
            />
            <Button type="submit" size="icon" loading={sending} disabled={!canSend || (!body.trim() && pendingFiles.length === 0)}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Attachments({ raw }: { raw?: string }) {
  let items: Attachment[] = [];
  try {
    items = raw ? JSON.parse(raw) : [];
  } catch {
    items = [];
  }
  if (!items.length) return null;
  return (
    <div className="mt-1.5 space-y-1.5">
      {items.map((a, i) => {
        if (a.type.startsWith("image/")) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={i} src={a.dataUrl} alt={a.name} className="max-h-44 max-w-full rounded-lg border border-white/10" />;
        }
        if (a.type.startsWith("video/")) {
          return <video key={i} src={a.dataUrl} controls className="max-h-44 max-w-full rounded-lg border border-white/10" />;
        }
        return (
          <a
            key={i}
            href={a.dataUrl}
            download={a.name}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs hover:bg-black/30"
          >
            <FileText className="h-4 w-4 shrink-0 text-sky-300" />
            <span className="max-w-[180px] truncate">{a.name}</span>
            <Download className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </a>
        );
      })}
    </div>
  );
}
