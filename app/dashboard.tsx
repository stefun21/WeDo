"use client";

import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Home,
  ListTodo,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Tasks", icon: ListTodo },
  { label: "Shopping", icon: ShoppingCart },
  { label: "Chat", icon: MessageCircle, badge: 3 },
  { label: "Calendar", icon: CalendarDays },
  { label: "Members", icon: Users },
  { label: "Settings", icon: Settings },
];

type Task = { id: string; title: string; done: boolean; person: string; when: string };
type ShoppingItem = { id: string; title: string; amount: string; done: boolean };
type Message = { id: string; body: string; createdAt: string; userId: string; displayName: string };

type Group = { id: string; name: string; role: "owner" | "admin" | "member"; memberCount: number };

export default function Dashboard({ user, groups }: { user: { username: string; displayName: string }; groups: Group[] }) {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [toast, setToast] = useState("");
  const [activeGroup, setActiveGroup] = useState(groups[0]);
  const [invite, setInvite] = useState("");
  const [quickAdd, setQuickAdd] = useState(false);
  const [editor, setEditor] = useState<"task" | "shopping" | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const loadWorkspace = useCallback(async () => {
    const response = await fetch(`/api/groups/${activeGroup.id}/workspace`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setTasks(data.tasks.map((task: { id: string; title: string; completed: boolean; assigned_name?: string; due_date?: string }) => ({
        id: task.id, title: task.title, done: task.completed,
        person: task.assigned_name?.slice(0, 1).toUpperCase() || user.displayName.slice(0, 1).toUpperCase(),
        when: task.due_date ? new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "",
      })));
      setShopping(data.shopping.map((item: { id: string; name: string; quantity?: string; completed: boolean }) => ({
        id: item.id, title: item.name, amount: item.quantity || "", done: item.completed,
      })));
    } else notify(data.error || "Could not load this group");
    setWorkspaceLoading(false);
  }, [activeGroup.id, user.displayName, notify]);

  // Loading remote collaborative state is the synchronization purpose of this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const loadChat = useCallback(async () => {
    const response = await fetch(`/api/groups/${activeGroup.id}/chat`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setMessages(data.messages.map((message: { id: string; body: string; created_at: string; user_id: string; display_name: string }) => ({
        id: message.id, body: message.body, createdAt: message.created_at,
        userId: message.user_id, displayName: message.display_name,
      })));
    }
  }, [activeGroup.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChat();
    const timer = window.setInterval(() => void loadChat(), 5000);
    return () => window.clearInterval(timer);
  }, [loadChat]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const createInvite = async () => {
    setQuickAdd(false);
    const response = await fetch(`/api/groups/${activeGroup.id}/invites`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return notify(data.error || "Invite could not be created");
    setInvite(data.code);
  };

  const toggleItem = async (type: "task" | "shopping", itemId: string, completed: boolean) => {
    if (type === "task") setTasks((all) => all.map((item) => item.id === itemId ? { ...item, done: completed } : item));
    else setShopping((all) => all.map((item) => item.id === itemId ? { ...item, done: completed } : item));
    const response = await fetch(`/api/groups/${activeGroup.id}/workspace`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, itemId, completed }),
    });
    if (!response.ok) { notify("The change could not be saved"); loadWorkspace(); }
  };

  const addWorkspaceItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/groups/${activeGroup.id}/workspace`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: editor, ...Object.fromEntries(form.entries()) }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || "Could not save the item");
    setEditor(null);
    notify(editor === "task" ? "Task added" : "Shopping item added");
    loadWorkspace();
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = new FormData(form).get("message");
    const message = String(input || "").trim();
    if (!message || sendingMessage) return;
    setSendingMessage(true);
    const response = await fetch(`/api/groups/${activeGroup.id}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (response.ok) { form.reset(); await loadChat(); }
    else { const data = await response.json(); notify(data.error || "Message could not be sent"); }
    setSendingMessage(false);
  };

  const enableNotifications = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return notify("Push notifications are not supported here");
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return notify("Notification keys are not configured yet");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return notify("Notification permission was not granted");
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    }
    const response = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
    notify(response.ok ? "Notifications enabled" : "Notifications could not be enabled");
  };

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Check /></div>
          <span>WeDo</span>
          <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X />
          </button>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon, badge }) => (
            <button
              key={label}
              className={active === label ? "nav-item active" : "nav-item"}
              onClick={() => {
                setActive(label);
                setMenuOpen(false);
                if (label !== "Overview") notify(`${label} will be connected in the next stages`);
              }}
            >
              <Icon />
              <span>{label}</span>
              {badge ? <small>{badge}</small> : null}
            </button>
          ))}
        </nav>

        <section className="workspace-card">
          <div className="workspace-title">
            <div className="workspace-icon"><Home /></div>
            <div><strong>{activeGroup.name}</strong><span>{activeGroup.memberCount} {activeGroup.memberCount === 1 ? "member" : "members"}</span></div>
            <ChevronDown />
          </div>
          <div className="avatar-stack" aria-label="Group members">
            <i>SF</i><i>AM</i><i>JD</i><i>+1</i>
          </div>
          <button className="invite-button" onClick={createInvite}>
            <UserPlus /> Invite member
          </button>
        </section>
      </aside>

      {menuOpen ? <button className="backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      <section className="content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <label className="search">
            <Search />
            <input aria-label="Search WeDo" placeholder="Search WeDo..." />
            <kbd>⌘ K</kbd>
          </label>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={enableNotifications}>
            <Bell />{messages.length ? <span>{Math.min(messages.length, 9)}</span> : null}
          </button>
          <button className="profile-button" onClick={logout} title="Log out">
            <b>{user.displayName.slice(0, 2).toUpperCase()}</b>
            <span>{user.displayName}</span><ChevronDown />
          </button>
        </header>

        <div className="dashboard">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><Sparkles /> YOUR SHARED SPACE</p>
              <h1>Good evening, {user.displayName}</h1>
              <div className="group-line">
                <button className="group-select" onClick={() => groups.length > 1 && setActiveGroup(groups[(groups.indexOf(activeGroup) + 1) % groups.length])}>
                  <Home /> {activeGroup.name} <ChevronDown />
                </button>
                <div className="avatar-stack hero-avatars"><i>{user.displayName.slice(0, 2).toUpperCase()}</i><i>AM</i><i>JD</i><i>+1</i></div>
              </div>
            </div>
            <button className="primary-button" onClick={() => setQuickAdd(true)}>Add new <Plus /></button>
          </section>

          <section className="overview-card">
            <div className="overview-heading"><h2>Overview</h2><button><MoreHorizontal /></button></div>
            <div className="metrics">
              <Metric icon={<CheckCircle2 />} color="mint" value={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} progress={tasks.length ? Math.round(tasks.filter((task) => task.done).length / tasks.length * 100) : 0} />
              <Metric icon={<ShoppingCart />} color="lime" value={`${shopping.length} items`} progress={72} />
              <Metric icon={<MessageCircle />} color="cyan" value={`${messages.length} messages`} progress={messages.length ? 65 : 0} />
            </div>
          </section>

          <section className="card-grid">
            <article className="module-card">
              <CardHeader title="Tasks" detail={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} />
              <div className="thin-progress"><span style={{ width: `${tasks.length ? tasks.filter((task) => task.done).length / tasks.length * 100 : 0}%` }} /></div>
              <div className="rows">
                {!workspaceLoading && !tasks.length ? <p className="empty-list">No tasks yet. Add the first one.</p> : null}
                {tasks.map((task) => (
                  <button
                    className={`item-row ${task.done ? "completed" : ""}`}
                    key={task.id}
                    onClick={() => toggleItem("task", task.id, !task.done)}
                  >
                    <span className="check">{task.done ? <Check /> : <Circle />}</span>
                    <span className="item-name">{task.title}</span>
                    <i className="mini-avatar">{task.person}</i>
                    <time>{task.when}</time>
                  </button>
                ))}
              </div>
              <button className="add-link mint-text" onClick={() => setEditor("task")}><Plus /> Add task</button>
            </article>

            <article className="module-card">
              <CardHeader title="Shopping" detail={`${shopping.length} items`} />
              <div className="thin-progress lime-progress"><span style={{ width: "72%" }} /></div>
              <div className="rows">
                {!workspaceLoading && !shopping.length ? <p className="empty-list">Your shopping list is empty.</p> : null}
                {shopping.map((item) => (
                  <button
                    className={`item-row ${item.done ? "completed" : ""}`}
                    key={item.id}
                    onClick={() => toggleItem("shopping", item.id, !item.done)}
                  >
                    <span className="check lime-check">{item.done ? <Check /> : <Circle />}</span>
                    <span className="item-name">{item.title}</span>
                    <small className="amount">{item.amount}</small>
                  </button>
                ))}
              </div>
              <button className="add-link lime-text" onClick={() => setEditor("shopping")}><Plus /> Add item</button>
            </article>

            <article className="module-card chat-card">
              <CardHeader title="Chat" detail={`${messages.length} messages`} />
              <div className="chat-list live-chat-list">
                {!messages.length ? <p className="empty-list">No messages yet. Say hello!</p> : null}
                {messages.slice(-4).map((message) => (
                  <ChatMessage
                    key={message.id}
                    initials={message.displayName.slice(0, 2).toUpperCase()}
                    name={message.displayName}
                    time={new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    message={message.body}
                  />
                ))}
              </div>
              <form className="chat-compose" onSubmit={sendMessage}>
                <input name="message" maxLength={2000} placeholder={`Message ${activeGroup.name}`} aria-label="Chat message" autoComplete="off" />
                <button disabled={sendingMessage} aria-label="Send message">↑</button>
              </form>
            </article>
          </section>
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map(({ label, icon: Icon, badge }) => (
          <button key={label} className={active === label ? "active" : ""} onClick={() => setActive(label)}>
            <span><Icon />{badge ? <small>{badge}</small> : null}</span>{label}
          </button>
        ))}
      </nav>

      {toast ? <div className="toast"><CheckCircle2 /> {toast}</div> : null}
      {quickAdd ? (
        <div className="invite-modal-backdrop" onClick={() => setQuickAdd(false)}>
          <section className="invite-modal quick-add-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setQuickAdd(false)}><X /></button>
            <p className="auth-kicker">QUICK ADD</p>
            <h2>What do you want to add?</h2>
            <div className="quick-add-list">
              <button onClick={createInvite}>
                <i><UserPlus /></i>
                <span><strong>Invite member</strong><small>Generate a private invitation code</small></span>
                <b>→</b>
              </button>
              <button onClick={() => { setQuickAdd(false); setEditor("task"); }}>
                <i><ListTodo /></i>
                <span><strong>Add task</strong><small>Create a shared task</small></span>
                <b>→</b>
              </button>
              <button onClick={() => { setQuickAdd(false); setEditor("shopping"); }}>
                <i><ShoppingCart /></i>
                <span><strong>Add shopping item</strong><small>Add it to the shared list</small></span>
                <b>→</b>
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {invite ? (
        <div className="invite-modal-backdrop" onClick={() => setInvite("")}>
          <section className="invite-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setInvite("")}><X /></button>
            <div className="success-icon"><UserPlus /></div>
            <p className="auth-kicker">PRIVATE INVITATION</p>
            <h2>Invite someone to {activeGroup.name}</h2>
            <p>Share this code. It expires automatically in 7 days.</p>
            <button className="recovery-code" onClick={() => { navigator.clipboard.writeText(invite); notify("Invite code copied"); }}>
              {invite}<span>Click to copy</span>
            </button>
          </section>
        </div>
      ) : null}
      {editor ? (
        <div className="invite-modal-backdrop" onClick={() => setEditor(null)}>
          <section className="invite-modal item-editor" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditor(null)}><X /></button>
            <p className="auth-kicker">{editor === "task" ? "NEW TASK" : "SHOPPING LIST"}</p>
            <h2>{editor === "task" ? "What needs to be done?" : "What do you need?"}</h2>
            <form onSubmit={addWorkspaceItem}>
              <label>
                {editor === "task" ? "Task title" : "Item name"}
                <input name={editor === "task" ? "title" : "name"} maxLength={180} autoFocus placeholder={editor === "task" ? "e.g. Pay the electricity bill" : "e.g. Milk"} required />
              </label>
              {editor === "task" ? <label>Due date <input type="date" name="dueDate" /></label> : <label>Quantity <input name="quantity" maxLength={30} placeholder="e.g. 2 or 1 kg" /></label>}
              <button className="auth-submit">Add to {activeGroup.name} <Plus /></button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ icon, color, value, progress }: { icon: React.ReactNode; color: string; value: string; progress: number }) {
  return <div className={`metric ${color}`}><div className="metric-icon">{icon}</div><div><strong>{value}</strong><div className="progress"><span style={{ width: `${progress}%` }} /></div></div></div>;
}

function CardHeader({ title, detail }: { title: string; detail: string }) {
  return <header className="card-header"><div><h2>{title}</h2><p>{detail}</p></div><button>View all</button></header>;
}

function ChatMessage({ initials, name, time, message }: { initials: string; name: string; time: string; message: string }) {
  return <div className="chat-message"><i className="chat-avatar">{initials}</i><div><div><strong>{name}</strong><time><span />{time}</time></div><p>{message}</p></div></div>;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}
