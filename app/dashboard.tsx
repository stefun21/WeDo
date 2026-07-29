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
import { useEffect, useState } from "react";

const navItems = [
  { label: "Overview", icon: Home },
  { label: "Tasks", icon: ListTodo },
  { label: "Shopping", icon: ShoppingCart },
  { label: "Chat", icon: MessageCircle, badge: 3 },
  { label: "Calendar", icon: CalendarDays },
  { label: "Members", icon: Users },
  { label: "Settings", icon: Settings },
];

const initialTasks = [
  { id: 1, title: "Prepare dinner", person: "M", when: "Today", done: true },
  { id: 2, title: "Take out the trash", person: "A", when: "Tomorrow", done: false },
  { id: 3, title: "Book weekend getaway", person: "S", when: "May 25", done: false },
  { id: 4, title: "Pay electricity bill", person: "J", when: "May 20", done: true },
];

const initialShopping = [
  { id: 1, title: "Milk", amount: "2", done: false },
  { id: 2, title: "Eggs", amount: "1 doz", done: false },
  { id: 3, title: "Chicken breasts", amount: "1 kg", done: false },
  { id: 4, title: "Bananas", amount: "6", done: true },
  { id: 5, title: "Dishwasher tablets", amount: "1", done: false },
];

type Group = { id: string; name: string; role: "owner" | "admin" | "member"; memberCount: number };

export default function Dashboard({ user, groups }: { user: { username: string; displayName: string }; groups: Group[] }) {
  const [active, setActive] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const [shopping, setShopping] = useState(initialShopping);
  const [toast, setToast] = useState("");
  const [activeGroup, setActiveGroup] = useState(groups[0]);
  const [invite, setInvite] = useState("");
  const [quickAdd, setQuickAdd] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

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
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify("You're all caught up")}>
            <Bell /><span>3</span>
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
              <Metric icon={<CheckCircle2 />} color="mint" value={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} progress={50} />
              <Metric icon={<ShoppingCart />} color="lime" value={`${shopping.length} items`} progress={72} />
              <Metric icon={<MessageCircle />} color="cyan" value="3 unread" progress={42} />
            </div>
          </section>

          <section className="card-grid">
            <article className="module-card">
              <CardHeader title="Tasks" detail={`${tasks.filter((task) => task.done).length} of ${tasks.length} complete`} />
              <div className="thin-progress"><span style={{ width: "50%" }} /></div>
              <div className="rows">
                {tasks.map((task) => (
                  <button
                    className={`item-row ${task.done ? "completed" : ""}`}
                    key={task.id}
                    onClick={() => setTasks((all) => all.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))}
                  >
                    <span className="check">{task.done ? <Check /> : <Circle />}</span>
                    <span className="item-name">{task.title}</span>
                    <i className="mini-avatar">{task.person}</i>
                    <time>{task.when}</time>
                  </button>
                ))}
              </div>
              <button className="add-link mint-text" onClick={() => notify("Task creator comes in Stage 4")}><Plus /> Add task</button>
            </article>

            <article className="module-card">
              <CardHeader title="Shopping" detail={`${shopping.length} items`} />
              <div className="thin-progress lime-progress"><span style={{ width: "72%" }} /></div>
              <div className="rows">
                {shopping.map((item) => (
                  <button
                    className={`item-row ${item.done ? "completed" : ""}`}
                    key={item.id}
                    onClick={() => setShopping((all) => all.map((entry) => entry.id === item.id ? { ...entry, done: !entry.done } : entry))}
                  >
                    <span className="check lime-check">{item.done ? <Check /> : <Circle />}</span>
                    <span className="item-name">{item.title}</span>
                    <small className="amount">{item.amount}</small>
                  </button>
                ))}
              </div>
              <button className="add-link lime-text" onClick={() => notify("Shopping editor comes in Stage 4")}><Plus /> Add item</button>
            </article>

            <article className="module-card chat-card">
              <CardHeader title="Chat" detail="3 unread" />
              <div className="chat-list">
                <ChatMessage initials="AM" name="Ana" time="7:45 PM" message="Can you pick up the dry cleaning tomorrow?" />
                <ChatMessage initials="JD" name="John" time="6:30 PM" message="I found some great hiking trails nearby!" />
              </div>
              <button className="add-link cyan-text" onClick={() => notify("Persistent chat comes in Stage 5")}>View all conversations <span>→</span></button>
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
              <button onClick={() => { setQuickAdd(false); notify("Task creator comes in Stage 4"); }}>
                <i><ListTodo /></i>
                <span><strong>Add task</strong><small>Available in the next stage</small></span>
                <b>→</b>
              </button>
              <button onClick={() => { setQuickAdd(false); notify("Shopping editor comes in Stage 4"); }}>
                <i><ShoppingCart /></i>
                <span><strong>Add shopping item</strong><small>Available in the next stage</small></span>
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
