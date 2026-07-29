"use client";

import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Home,
  ListTodo,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  UserPlus,
  Users,
  WifiOff,
  Download,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Tasks", icon: ListTodo },
  { label: "Shopping", icon: ShoppingCart },
  { label: "Chat", icon: MessageCircle },
];

type Task = { id: string; title: string; done: boolean; person: string; when: string };
type ShoppingItem = { id: string; title: string; amount: string; done: boolean };
type Message = { id: string; body: string; createdAt: string; userId: string; displayName: string };
type Member = { id: string; username: string; display_name: string; role: "owner" | "admin" | "member"; joined_at: string };
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type Group = { id: string; name: string; role: "owner" | "admin" | "member"; memberCount: number };

export default function Dashboard({ user, groups }: { user: { id: string; username: string; displayName: string }; groups: Group[] }) {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shopping, setShopping] = useState<ShoppingItem[]>([]);
  const [toast, setToast] = useState("");
  const [activeGroup] = useState(groups[0]);
  const [invite, setInvite] = useState("");
  const [quickAdd, setQuickAdd] = useState(false);
  const [editor, setEditor] = useState<"task" | "shopping" | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [online, setOnline] = useState(true);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [groupMembers, setGroupMembers] = useState<Member[]>([]);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatDraft, setChatDraft] = useState("");
  const [inviteRolePicker, setInviteRolePicker] = useState(false);
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<Member | null>(null);
  const [taskPage, setTaskPage] = useState(0);
  const [shoppingPage, setShoppingPage] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [menuOpen]);

  useEffect(() => {
    const initialStatus = window.setTimeout(() => setOnline(navigator.onLine), 0);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.clearTimeout(initialStatus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
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
      localStorage.setItem(`wedo-workspace-${activeGroup.id}`, JSON.stringify(data));
    } else {
      const cached = localStorage.getItem(`wedo-workspace-${activeGroup.id}`);
      if (cached) {
        const stored = JSON.parse(cached);
        setTasks(stored.tasks.map((task: { id: string; title: string; completed: boolean; assigned_name?: string; due_date?: string }) => ({ id: task.id, title: task.title, done: task.completed, person: task.assigned_name?.slice(0, 1).toUpperCase() || user.displayName.slice(0, 1).toUpperCase(), when: task.due_date ? new Date(task.due_date).toLocaleDateString() : "" })));
        setShopping(stored.shopping.map((item: { id: string; name: string; quantity?: string; completed: boolean }) => ({ id: item.id, title: item.name, amount: item.quantity || "", done: item.completed })));
      } else notify("Could not load this group");
    }
    setWorkspaceLoading(false);
  }, [activeGroup.id, user.displayName, notify]);

  // Loading remote collaborative state is the synchronization purpose of this effect.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadWorkspace(); }, [loadWorkspace]);

  const loadChat = useCallback(async (markRead = false) => {
    const response = await fetch(`/api/groups/${activeGroup.id}/chat${markRead ? "?markRead=1" : ""}`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setMessages(data.messages.map((message: { id: string; body: string; created_at: string; user_id: string; display_name: string }) => ({
        id: message.id, body: message.body, createdAt: message.created_at,
        userId: message.user_id, displayName: message.display_name,
      })));
      setUnreadCount(Number(data.unreadCount || 0));
      localStorage.setItem(`wedo-chat-${activeGroup.id}`, JSON.stringify(data.messages));
    } else {
      const cached = localStorage.getItem(`wedo-chat-${activeGroup.id}`);
      if (cached) setMessages(JSON.parse(cached).map((message: { id: string; body: string; created_at: string; user_id: string; display_name: string }) => ({ id: message.id, body: message.body, createdAt: message.created_at, userId: message.user_id, displayName: message.display_name })));
    }
  }, [activeGroup.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadChat(active === "Chat");
    const timer = window.setInterval(() => void loadChat(active === "Chat"), 5000);
    return () => window.clearInterval(timer);
  }, [loadChat, active]);

  const loadGroupMembers = useCallback(async () => {
    const response = await fetch(`/api/groups/${activeGroup.id}/members`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setGroupMembers(data.members);
  }, [activeGroup.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGroupMembers();
  }, [loadGroupMembers]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const createInvite = () => {
    setQuickAdd(false);
    setMembers(null);
    setInviteRole("member");
    setInviteRolePicker(true);
  };

  const generateInvite = async () => {
    const response = await fetch(`/api/groups/${activeGroup.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: inviteRole }),
    });
    const data = await response.json();
    if (!response.ok) return notify(data.error || "Invite could not be created");
    setInviteRolePicker(false);
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
    const message = chatDraft.trim();
    if (!message || sendingMessage) return;
    setSendingMessage(true);
    const response = await fetch(`/api/groups/${activeGroup.id}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (response.ok) { form.reset(); setChatDraft(""); await loadChat(true); }
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

  const navigate = async (label: string) => {
    setMenuOpen(false);
    if (label === "Members") {
      const response = await fetch(`/api/groups/${activeGroup.id}/members`, { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setMembers(data.members);
      else notify(data.error || "Members could not be loaded");
      return;
    }
    setActive(label);
    if (label === "Chat") void loadChat(true);
    document.getElementById("dashboard-top")?.scrollIntoView({ behavior: "auto", block: "start" });
  };

  const showMembers = async () => {
    const response = await fetch(`/api/groups/${activeGroup.id}/members`, { cache: "no-store" });
    const data = await response.json();
    if (response.ok) setMembers(data.members);
    else notify(data.error || "Members could not be loaded");
  };

  const updateMember = async (memberId: string, action: "role" | "remove", role?: "admin" | "member") => {
    const endpoint = `/api/groups/${activeGroup.id}/members${action === "remove" ? `?memberId=${memberId}` : ""}`;
    const response = await fetch(endpoint, {
      method: action === "remove" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "role" ? JSON.stringify({ memberId, role }) : undefined,
    });
    if (!response.ok) { const data = await response.json(); return notify(data.error || "Member could not be updated"); }
    setMembers((current) => current ? current.filter((entry) => action !== "remove" || entry.id !== memberId).map((entry) => entry.id === memberId && role ? { ...entry, role } : entry) : null);
    setGroupMembers((current) => current.filter((entry) => action !== "remove" || entry.id !== memberId).map((entry) => entry.id === memberId && role ? { ...entry, role } : entry));
    setEditingMember(null);
    setKickTarget(null);
    notify(action === "remove" ? "Member removed" : "Role updated");
  };

  const installApp = async () => {
    if (!installPrompt) return notify("Use your browser menu and choose Install app");
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const filteredTasks = tasks.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredShopping = shopping.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMessages = messages.filter((item) => `${item.displayName} ${item.body}`.toLowerCase().includes(searchQuery.toLowerCase()));
  const taskPageCount = Math.max(1, Math.ceil(filteredTasks.length / 4));
  const shoppingPageCount = Math.max(1, Math.ceil(filteredShopping.length / 4));
  const visibleTasks = filteredTasks.slice(Math.min(taskPage, taskPageCount - 1) * 4, Math.min(taskPage, taskPageCount - 1) * 4 + 4);
  const visibleShopping = filteredShopping.slice(Math.min(shoppingPage, shoppingPageCount - 1) * 4, Math.min(shoppingPage, shoppingPageCount - 1) * 4 + 4);
  const latestMessage = messages.at(-1);
  const mentionMatch = chatDraft.match(/@([a-zA-Z0-9_-]*)$/);
  const mentionSuggestions = mentionMatch
    ? groupMembers.filter((member) => member.id !== user.id && member.username.toLowerCase().startsWith(mentionMatch[1].toLowerCase())).slice(0, 5)
    : [];

  const selectMention = (username: string) => {
    setChatDraft((current) => current.replace(/@([a-zA-Z0-9_-]*)$/, `@${username} `));
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
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={active === label ? "nav-item active" : "nav-item"}
              onClick={() => navigate(label)}
            >
              <Icon />
              <span>{label}</span>
              {label === "Chat" && unreadCount > 0 ? <small>{Math.min(unreadCount, 99)}</small> : null}
            </button>
          ))}
        </nav>

        <section className="workspace-card">
          <button className="sidebar-members-button" onClick={showMembers}>
            <span><Users /></span>
            <span><strong>Members</strong><small>{groupMembers.length} in this group</small></span>
            <b>{groupMembers.length}</b>
          </button>
          <button className="invite-button" onClick={createInvite}>
            <UserPlus /> Invite member
          </button>
          <button className="invite-button install-button" onClick={installApp}><Download /> Install WeDo</button>
        </section>
      </aside>

      {menuOpen ? <button className="backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /> : null}

      <section className="content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <label className="search">
            <Search />
            <input aria-label="Search WeDo" placeholder="Search WeDo..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            <kbd>⌘ K</kbd>
          </label>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={enableNotifications}>
            <Bell />{unreadCount > 0 ? <span>{Math.min(unreadCount, 9)}</span> : null}
          </button>
          <div className="profile-menu">
            <button
              className={`profile-button ${profileOpen ? "open" : ""}`}
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <b>{user.displayName.slice(0, 2).toUpperCase()}</b>
              <span>{user.displayName}</span><ChevronDown />
            </button>
            {profileOpen ? (
              <>
                <button className="profile-dismiss" aria-label="Close profile menu" onClick={() => setProfileOpen(false)} />
                <div className="profile-dropdown" role="menu">
                  <div className="profile-summary">
                    <b>{user.displayName.slice(0, 2).toUpperCase()}</b>
                    <span><strong>{user.displayName}</strong><small>@{user.username}</small></span>
                  </div>
                  <button role="menuitem" onClick={logout}><LogOut /> Log out</button>
                </div>
              </>
            ) : null}
          </div>
        </header>

        {!online ? <div className="offline-banner"><WifiOff /> You’re offline — showing saved data</div> : null}
        <div className={`dashboard dashboard-${active.toLowerCase()}`} id="dashboard-top">
          <section className="welcome-row">
            <div>
              <p className="eyebrow"><Sparkles /> YOUR SHARED SPACE</p>
              <h1>Good evening, {user.displayName}</h1>
              <div className="group-line">
                <button className="group-select members-trigger" onClick={showMembers}>
                  <Users /> Members <span>{groupMembers.length}</span>
                </button>
              </div>
            </div>
            <button className="primary-button" onClick={() => setQuickAdd(true)}>Add new <Plus /></button>
          </section>

          {active === "Overview" ? <section className="overview-card">
            <div className="overview-heading"><h2>Overview</h2><button><MoreHorizontal /></button></div>
            <div className="metrics">
              <Metric onOpen={() => navigate("Tasks")} icon={<CheckCircle2 />} color="mint" value={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} progress={tasks.length ? Math.round(tasks.filter((task) => task.done).length / tasks.length * 100) : 0} />
              <Metric onOpen={() => navigate("Shopping")} icon={<ShoppingCart />} color="lime" value={`${shopping.filter((item) => item.done).length} of ${shopping.length} bought`} progress={shopping.length ? Math.round(shopping.filter((item) => item.done).length / shopping.length * 100) : 0} showProgress={shopping.length > 0} />
              <div className={`metric cyan latest-message metric-link ${latestMessage && latestMessage.userId !== user.id && unreadCount > 0 ? "unread" : "read"}`} role="button" tabIndex={0} onClick={() => navigate("Chat")} onKeyDown={(event) => event.key === "Enter" && navigate("Chat")}>
                <div className="metric-icon"><MessageCircle /></div>
                <div><strong>{latestMessage ? `${latestMessage.displayName}: ${latestMessage.body}` : "No messages yet"}</strong><small>{latestMessage ? new Date(latestMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Start the conversation"}</small></div>
              </div>
            </div>
          </section> : null}

          <section className={`card-grid ${active !== "Overview" ? "single-module" : ""}`}>
            {active === "Overview" || active === "Tasks" ? <article className="module-card" id="tasks">
              {active === "Overview" ? <button className="module-card-hitbox" aria-label="Open Tasks" onClick={() => navigate("Tasks")} /> : null}
              <CardHeader title="Tasks" detail={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} onOpen={() => navigate("Tasks")} />
              <div className="thin-progress"><span style={{ width: `${tasks.length ? tasks.filter((task) => task.done).length / tasks.length * 100 : 0}%` }} /></div>
              <div className="rows">
                {!workspaceLoading && !tasks.length ? <p className="empty-list">No tasks yet. Add the first one.</p> : null}
                {visibleTasks.map((task) => (
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
              <ListPager page={Math.min(taskPage, taskPageCount - 1)} pages={taskPageCount} setPage={setTaskPage} />
              <button className="add-link mint-text" onClick={() => setEditor("task")}><Plus /> Add task</button>
            </article> : null}

            {active === "Overview" || active === "Shopping" ? <article className="module-card" id="shopping">
              {active === "Overview" ? <button className="module-card-hitbox" aria-label="Open Shopping" onClick={() => navigate("Shopping")} /> : null}
              <CardHeader title="Shopping" detail={`${shopping.length} items`} onOpen={() => navigate("Shopping")} />
              {shopping.length > 0 ? <div className="thin-progress lime-progress"><span style={{ width: `${Math.round(shopping.filter((item) => item.done).length / shopping.length * 100)}%` }} /></div> : null}
              <div className="rows">
                {!workspaceLoading && !shopping.length ? <p className="empty-list">Your shopping list is empty.</p> : null}
                {visibleShopping.map((item) => (
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
              <ListPager page={Math.min(shoppingPage, shoppingPageCount - 1)} pages={shoppingPageCount} setPage={setShoppingPage} />
              <button className="add-link lime-text" onClick={() => setEditor("shopping")}><Plus /> Add item</button>
            </article> : null}

            {active === "Overview" || active === "Chat" ? <article className="module-card chat-card" id="chat">
              {active === "Overview" ? <button className="module-card-hitbox" aria-label="Open Chat" onClick={() => navigate("Chat")} /> : null}
              <CardHeader title="Chat" detail={`${messages.length} messages`} onOpen={() => navigate("Chat")} />
              <div className="chat-list live-chat-list">
                {!messages.length ? <p className="empty-list">No messages yet. Say hello!</p> : null}
                {filteredMessages.slice(-4).map((message) => (
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
                {mentionSuggestions.length ? <div className="mention-suggestions">
                  {mentionSuggestions.map((member) => <button type="button" key={member.id} onClick={() => selectMention(member.username)}><i>{member.display_name.slice(0, 2).toUpperCase()}</i><span><strong>{member.display_name}</strong><small>@{member.username}</small></span></button>)}
                </div> : null}
                <input name="message" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} maxLength={2000} placeholder={`Message ${activeGroup.name}`} aria-label="Chat message" autoComplete="off" />
                <button disabled={sendingMessage} aria-label="Send message">↑</button>
              </form>
            </article> : null}
          </section>
        </div>
      </section>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map(({ label, icon: Icon }) => (
          <button key={label} className={active === label ? "active" : ""} onClick={() => navigate(label)}>
            <span><Icon />{label === "Chat" && unreadCount > 0 ? <small>{Math.min(unreadCount, 99)}</small> : null}</span>{label}
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
            <p>Share this code. They’ll join as <strong>{inviteRole}</strong>, and the code expires automatically in 7 days.</p>
            <button className="recovery-code" onClick={() => { navigator.clipboard.writeText(invite); notify("Invite code copied"); }}>
              {invite}<span>Click to copy</span>
            </button>
          </section>
        </div>
      ) : null}
      {inviteRolePicker ? (
        <div className="invite-modal-backdrop" onClick={() => setInviteRolePicker(false)}>
          <section className="invite-modal role-picker-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setInviteRolePicker(false)}><X /></button>
            <p className="auth-kicker">INVITE TO {activeGroup.name.toUpperCase()}</p>
            <h2>Choose their role</h2>
            <p>You can change this later from the Members list.</p>
            <div className="role-options">
              <button className={inviteRole === "member" ? "active" : ""} onClick={() => setInviteRole("member")}><span><strong>Member</strong><small>Can use tasks, shopping and chat.</small></span><i>{inviteRole === "member" ? <Check /> : null}</i></button>
              {activeGroup.role === "owner" ? <button className={inviteRole === "admin" ? "active" : ""} onClick={() => setInviteRole("admin")}><span><strong>Admin</strong><small>Can also invite people and help manage the group.</small></span><i>{inviteRole === "admin" ? <Check /> : null}</i></button> : null}
            </div>
            <button className="auth-submit" onClick={generateInvite}><UserPlus /> Generate invite</button>
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
      {members ? (
        <div className="invite-modal-backdrop" onClick={() => setMembers(null)}>
          <section className="invite-modal members-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setMembers(null)}><X /></button>
            <p className="auth-kicker">{activeGroup.name.toUpperCase()}</p>
            <h2>Group members</h2>
            <div className="members-list">
              {members.map((member) => (
                <div className="member-row" key={member.id}>
                  <i>{member.display_name.slice(0, 2).toUpperCase()}</i>
                  <span><strong>{member.display_name}</strong><small>@{member.username}</small></span>
                  <b>{member.role}</b>
                  {activeGroup.role === "owner" && member.role !== "owner" ? (
                    <>
                      {editingMember === member.id ? <select value={member.role} autoFocus onChange={(event) => updateMember(member.id, "role", event.target.value as "admin" | "member")}><option value="member">Member</option><option value="admin">Admin</option></select> : <button className="edit-role-button" onClick={() => setEditingMember(member.id)}>Edit</button>}
                      <button className="kick-button" onClick={() => setKickTarget(member)} aria-label={`Kick ${member.display_name}`}><X /></button>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <button className="auth-submit" onClick={() => { setMembers(null); createInvite(); }}><UserPlus /> Invite another member</button>
          </section>
        </div>
      ) : null}
      {kickTarget ? (
        <div className="invite-modal-backdrop confirmation-backdrop" onClick={() => setKickTarget(null)}>
          <section className="invite-modal kick-confirmation" onClick={(event) => event.stopPropagation()}>
            <div className="danger-icon"><X /></div>
            <p className="auth-kicker">REMOVE MEMBER</p>
            <h2>Kick {kickTarget.display_name}?</h2>
            <p>Are you sure you want to remove <strong>{kickTarget.display_name}</strong> from {activeGroup.name}? They will lose access to the group immediately.</p>
            <div className="confirmation-actions">
              <button onClick={() => setKickTarget(null)}>Cancel</button>
              <button onClick={() => updateMember(kickTarget.id, "remove")}>Yes, kick member</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Metric({ icon, color, value, progress, showProgress = true, onOpen }: { icon: React.ReactNode; color: string; value: string; progress: number; showProgress?: boolean; onOpen?: () => void }) {
  return <div className={`metric ${color} ${onOpen ? "metric-link" : ""}`} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onClick={onOpen} onKeyDown={(event) => event.key === "Enter" && onOpen?.()}><div className="metric-icon">{icon}</div><div><strong>{value}</strong>{showProgress ? <div className="progress"><span style={{ width: `${progress}%` }} /></div> : null}</div></div>;
}

function CardHeader({ title, detail, onOpen }: { title: string; detail: string; onOpen: () => void }) {
  return <header className="card-header"><button className="card-title-link" onClick={onOpen}><h2>{title}</h2><p>{detail}</p></button><button onClick={onOpen}>View all</button></header>;
}

function ListPager({ page, pages, setPage }: { page: number; pages: number; setPage: React.Dispatch<React.SetStateAction<number>> }) {
  if (pages <= 1) return null;
  return <div className="list-pager"><button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>←</button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage((value) => Math.min(pages - 1, value + 1))}>→</button></div>;
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
