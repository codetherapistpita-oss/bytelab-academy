"use client";

import { useEffect, useMemo, useState } from "react";
import { AuthUser, clearSession, loadSession, signInWithGoogle } from "../lib/auth";
import { postToAcademy } from "../lib/api";
import styles from "./admin.module.css";

type Enrollment = {
  enrollmentId: string; email: string; courseId: string; courseTitle: string;
  learningMode: string; experience: string; goals: string; status: string;
  createdAt: string; updatedAt: string; fullName: string; age: string | number;
  phone: string; whatsapp: string; district: string; education: string;
  occupation: string; historicalSnapshot: boolean;
};
type Student = {
  userId: string; email: string; fullName: string; age: string | number;
  phone: string; whatsapp: string; district: string; education: string;
  occupation: string; createdAt: string;
};
type Course = {
  courseId: string; title: string; category: string; duration: string;
  delivery: string; level: string; status: string;
};
type Dashboard = {
  admin: { email: string; role: string };
  counts: { students: number; enrollments: number; pending: number; approved: number; rejected: number; openCourses: number };
  students: Student[]; enrollments: Enrollment[]; courses: Course[];
  allowedStatuses: string[]; generatedAt: string;
};
type View = "overview" | "applications" | "students" | "courses";

const nav: Array<{id: View; label: string; icon: string}> = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "applications", label: "Applications", icon: "▤" },
  { id: "students", label: "Students", icon: "◎" },
  { id: "courses", label: "Courses", icon: "◇" },
];

export default function AdminPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const [updating, setUpdating] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const session = loadSession();
    setUser(session);
    if (!session) setLoading(false);
  }, []);

  useEffect(() => {
    if (user) refresh(user);
  }, [user]);

  async function refresh(activeUser: AuthUser) {
    setLoading(true);
    setError("");
    try {
      setData(await postToAcademy<Dashboard>("adminDashboard", activeUser.idToken));
    } catch (caught) {
      setData(null);
      setError(caught instanceof Error ? caught.message : "The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function login() {
    setSigningIn(true);
    setError("");
    try {
      setUser(await signInWithGoogle());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google Sign-In failed.");
    } finally {
      setSigningIn(false);
    }
  }

  function logout() {
    clearSession();
    setUser(null);
    setData(null);
    setError("");
  }

  async function updateStatus(status: string) {
    if (!user || !selected || status === selected.status) return;
    setUpdating(true);
    try {
      await postToAcademy("adminUpdateEnrollment", user.idToken, {
        enrollmentId: selected.enrollmentId,
        status,
      });
      setSelected({ ...selected, status });
      await refresh(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Status update failed.");
    } finally {
      setUpdating(false);
    }
  }

  const applications = useMemo(() => {
    if (!data) return [];
    const term = search.toLowerCase().trim();
    return data.enrollments.filter((item) => {
      const text = [item.fullName, item.email, item.phone, item.courseTitle, item.enrollmentId, item.district].join(" ").toLowerCase();
      return (filter === "All" || item.status === filter) && (!term || text.includes(term));
    });
  }, [data, search, filter]);

  const students = useMemo(() => {
    if (!data) return [];
    const term = search.toLowerCase().trim();
    return data.students.filter((item) =>
      !term || [item.fullName, item.email, item.phone, item.district, item.education].join(" ").toLowerCase().includes(term)
    );
  }, [data, search]);

  if (!user) return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <a href="../">← Return to academy</a>
        <div className={styles.brand}><span>BL</span><div><strong>ByteLab</strong><small>Academy Administration</small></div></div>
        <p className={styles.eyebrow}>SECURE ADMINISTRATOR ACCESS</p>
        <h1>Manage the academy with clarity.</h1>
        <p>Review applications, students and courses from one protected workspace.</p>
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.googleButton} onClick={login} disabled={signingIn}>
          <span>G</span>{signingIn ? "Verifying administrator…" : "Continue with Google"}
        </button>
        <small>Only accounts listed in the Admins sheet can enter.</small>
      </section>
    </main>
  );

  if (loading && !data) return (
    <main className={styles.loadingPage}><i /><strong>Opening administrator dashboard…</strong><small>{user.email}</small></main>
  );

  if (!data) return (
    <main className={styles.loginPage}>
      <section className={styles.denied}>
        <b>!</b><h1>Access was not authorized.</h1><p>{error}</p><strong>{user.email}</strong>
        <button onClick={logout}>Use another Google account</button>
      </section>
    </main>
  );

  return (
    <main className={styles.shell}>
      <aside className={`${styles.sidebar} ${menu ? styles.open : ""}`}>
        <div className={styles.sideBrand}><span>BL</span><div><strong>ByteLab</strong><small>Academy Admin</small></div></div>
        <nav>
          <small>MANAGEMENT</small>
          {nav.map((item) => (
            <button key={item.id} className={view === item.id ? styles.active : ""} onClick={() => { setView(item.id); setSearch(""); setMenu(false); }}>
              <span>{item.icon}</span>{item.label}
              {item.id === "applications" && data.counts.pending > 0 && <b>{data.counts.pending}</b>}
            </button>
          ))}
        </nav>
        <div className={styles.account}>
          <span>{data.admin.email[0].toUpperCase()}</span>
          <div><strong>{data.admin.role}</strong><small>{data.admin.email}</small></div>
          <button onClick={logout}>↗</button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header>
          <button className={styles.menuButton} onClick={() => setMenu(!menu)}>☰</button>
          <div><p>{longDate()}</p><h1>{nav.find((item) => item.id === view)?.label}</h1></div>
          <div className={styles.actions}>
            <button onClick={() => refresh(user)} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
            <a href="../" target="_blank">Website ↗</a>
          </div>
        </header>
        {error && <div className={styles.workspaceError}>{error}<button onClick={() => setError("")}>×</button></div>}

        <div className={styles.content}>
          {view === "overview" && <Overview data={data} onSelect={(item) => { setSelected(item); setView("applications"); }} />}

          {view === "applications" && <>
            <Tools search={search} setSearch={setSearch}>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option>All</option>{data.allowedStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </Tools>
            <div className={styles.table}>
              <div className={styles.tableHead}><span>Applicant</span><span>Course</span><span>Submitted</span><span>Status</span></div>
              {applications.map((item) => <button className={styles.row} key={item.enrollmentId} onClick={() => setSelected(item)}>
                <Person name={item.fullName} email={item.email} />
                <span><strong>{item.courseTitle}</strong><small>{item.enrollmentId}</small></span>
                <span><strong>{date(item.createdAt)}</strong><small>{item.learningMode}</small></span>
                <Badge status={item.status} />
              </button>)}
              {!applications.length && <Empty text="No matching applications." />}
            </div>
          </>}

          {view === "students" && <>
            <Tools search={search} setSearch={setSearch}><b>{students.length} students</b></Tools>
            <div className={styles.table}>
              <div className={`${styles.tableHead} ${styles.studentCols}`}><span>Student</span><span>Contact</span><span>Location</span><span>Education</span></div>
              {students.map((item) => <div className={`${styles.row} ${styles.studentCols}`} key={item.userId}>
                <Person name={item.fullName} email={item.email} />
                <span><strong>{item.phone || "No phone"}</strong><small>{item.whatsapp || "No WhatsApp"}</small></span>
                <span><strong>{item.district || "—"}</strong><small>Age {item.age || "—"}</small></span>
                <span><strong>{item.education || "—"}</strong><small>{item.occupation || "—"}</small></span>
              </div>)}
              {!students.length && <Empty text="No matching students." />}
            </div>
          </>}

          {view === "courses" && <div className={styles.courseGrid}>{data.courses.map((course, index) => (
            <article key={course.courseId}><div><b>{String(index + 1).padStart(2, "0")}</b><Badge status={course.status} /></div>
              <p>{course.category}</p><h2>{course.title}</h2>
              <dl><div><dt>Duration</dt><dd>{course.duration}</dd></div><div><dt>Delivery</dt><dd>{course.delivery}</dd></div><div><dt>Level</dt><dd>{course.level}</dd></div></dl>
            </article>
          ))}</div>}
        </div>
      </section>

      {selected && <Drawer item={selected} statuses={data.allowedStatuses} updating={updating} update={updateStatus} close={() => setSelected(null)} />}
      {menu && <button className={styles.backdrop} onClick={() => setMenu(false)} />}
    </main>
  );
}

function Overview({ data, onSelect }: { data: Dashboard; onSelect: (item: Enrollment) => void }) {
  const cards = [
    ["Registered students", data.counts.students, "blue"],
    ["Total applications", data.counts.enrollments, "violet"],
    ["Pending review", data.counts.pending, "red"],
    ["Approved", data.counts.approved, "green"],
  ];
  return <><section className={styles.welcome}><div><p className={styles.eyebrow}>ACADEMY CONTROL CENTRE</p><h2>Good to see you.</h2><small>Here is the latest activity across ByteLab Academy.</small></div><div className={styles.online}><i /><span><strong>System online</strong><small>Updated {date(data.generatedAt)}</small></span></div></section>
    <section className={styles.stats}>{cards.map(([label, value, tone]) => <article key={String(label)} data-tone={tone}><span>{label}</span><strong>{value}</strong><small>Live academy data</small></article>)}</section>
    <section className={styles.panels}><article className={styles.panel}><div className={styles.panelTitle}><span><p className={styles.eyebrow}>RECENT ACTIVITY</p><h3>Latest applications</h3></span><b>{data.enrollments.length} total</b></div>
      {data.enrollments.slice(0, 7).map((item) => <button className={styles.recent} key={item.enrollmentId} onClick={() => onSelect(item)}><Person name={item.fullName} email={item.email} /><Badge status={item.status} /><time>{date(item.createdAt)}</time></button>)}
      {!data.enrollments.length && <Empty text="No applications yet." />}</article>
      <article className={styles.panel}><div className={styles.panelTitle}><span><p className={styles.eyebrow}>COURSES</p><h3>Enrollment distribution</h3></span><b>{data.counts.openCourses} open</b></div>
        <div className={styles.distribution}>{data.courses.map((course) => { const count = data.enrollments.filter((e) => e.courseId === course.courseId).length; const percent = data.counts.enrollments ? Math.round(count / data.counts.enrollments * 100) : 0; return <div key={course.courseId}><span><strong>{course.title}</strong><small>{count} applications</small></span><i><b style={{width: `${percent}%`}} /></i><em>{percent}%</em></div>; })}</div>
      </article></section>
  </>;
}

function Tools({ search, setSearch, children }: { search: string; setSearch: (v: string) => void; children: React.ReactNode }) {
  return <div className={styles.tools}><label><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records…" /></label>{children}</div>;
}
function Person({ name, email }: { name: string; email: string }) {
  return <span className={styles.person}><i>{initials(name || email)}</i><span><strong>{name || "Profile incomplete"}</strong><small>{email}</small></span></span>;
}
function Badge({ status }: { status: string }) {
  return <span className={styles.badge} data-status={status.toLowerCase().replace(/\s+/g, "-")}>{status}</span>;
}
function Empty({ text }: { text: string }) {
  return <div className={styles.empty}><span>◇</span><strong>{text}</strong></div>;
}
function Drawer({ item, statuses, updating, update, close }: { item: Enrollment; statuses: string[]; updating: boolean; update: (s: string) => void; close: () => void }) {
  return <div className={styles.drawerShell}><button className={styles.drawerBg} onClick={close} /><aside className={styles.drawer}><button className={styles.close} onClick={close}>×</button>
    <p className={styles.eyebrow}>APPLICATION DETAILS</p><h1>{item.fullName || item.email}</h1><div className={styles.ref}><span>{item.enrollmentId}</span><Badge status={item.status} /></div>
    <label className={styles.status}><span>Application status</span><select value={item.status} disabled={updating} onChange={(e) => update(e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select><small>{updating ? "Saving…" : "Every change is recorded in the audit log."}</small></label>
    <section><h3>Course</h3><strong>{item.courseTitle}</strong><p>{item.learningMode} · {item.experience}</p></section>
    <div className={styles.details}>{[["Email",item.email],["Phone",item.phone],["WhatsApp",item.whatsapp],["Age",String(item.age || "—")],["District",item.district],["Education",item.education],["Occupation",item.occupation],["Submitted",date(item.createdAt)]].map(([a,b]) => <div key={a}><span>{a}</span><strong>{b || "Not provided"}</strong></div>)}</div>
    <section><h3>Learning goal</h3><p>{item.goals}</p></section>
    {!item.historicalSnapshot && <div className={styles.legacy}>This older application uses the student&apos;s current profile because it was submitted before snapshots were enabled.</div>}
  </aside></div>;
}
function initials(value: string) { return value.split(/\s+/).filter(Boolean).slice(0,2).map((p) => p[0]?.toUpperCase()).join("") || "?"; }
function date(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value || "—") : new Intl.DateTimeFormat("en-UG",{day:"2-digit",month:"short",year:"numeric"}).format(d); }
function longDate() { return new Intl.DateTimeFormat("en-UG",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date()); }

