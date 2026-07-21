"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Course, courses } from "./data/courses";
import {
  AuthUser,
  clearSession,
  loadSession,
  reloadUser,
  resendVerification,
  sendPasswordReset,
  signIn,
  signUp,
} from "./lib/auth";
import { fetchPublicCourses, submitEnrollment } from "./lib/api";
import { appConfig } from "./lib/config";

type AuthView = "signin" | "signup" | "reset" | "verify";

const Arrow = () => <span aria-hidden="true">↗</span>;
const Check = () => <span className="check" aria-hidden="true">✓</span>;

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [academyCourses, setAcademyCourses] = useState<Course[]>(courses);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [enrollmentCourse, setEnrollmentCourse] = useState<Course | null>(null);
  const [pendingCourse, setPendingCourse] = useState<Course | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView>("signin");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setUser(loadSession()));
    fetchPublicCourses()
      .then((remoteCourses) => {
        if (remoteCourses.length) setAcademyCourses(remoteCourses);
      })
      .catch(() => {
        // The locally bundled course list keeps the public catalogue available.
      });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelectedCourse(null);
      setEnrollmentCourse(null);
      setAuthOpen(false);
      setAccountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visibleCourses = useMemo(() => {
    const term = search.trim().toLowerCase();
    return academyCourses.filter((course) => {
      const matchesCategory =
        category === "All courses" || course.category === category;
      const matchesTerm =
        !term ||
        [course.title, course.category, course.summary, ...course.modules]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [academyCourses, category, search]);

  const courseCategories = useMemo(
    () => ["All courses", ...Array.from(new Set(academyCourses.map((course) => course.category)))],
    [academyCourses],
  );

  function openAuth(view: AuthView = "signin", course: Course | null = null) {
    setPendingCourse(course);
    setAuthView(view);
    setAuthOpen(true);
    setSelectedCourse(null);
  }

  function beginEnrollment(course: Course) {
    if (!user) {
      openAuth("signin", course);
      return;
    }
    if (!user.emailVerified) {
      setPendingCourse(course);
      setAuthView("verify");
      setAuthOpen(true);
      setSelectedCourse(null);
      return;
    }
    setSelectedCourse(null);
    setEnrollmentCourse(course);
  }

  function finishAuth(nextUser: AuthUser) {
    setUser(nextUser);
    if (nextUser.emailVerified && pendingCourse) {
      setAuthOpen(false);
      setEnrollmentCourse(pendingCourse);
      setPendingCourse(null);
    } else if (nextUser.emailVerified) {
      setAuthOpen(false);
      setToast(`Welcome back, ${nextUser.email}.`);
    } else {
      setAuthView("verify");
    }
  }

  function signOut() {
    clearSession();
    setUser(null);
    setAccountOpen(false);
    setToast("You have signed out safely.");
  }

  return (
    <main>
      <header className="site-header">
        <div className="announcement">
          <div className="container announcement-inner">
            <p><span>Admissions desk</span> Applications are open for the next learning cycle.</p>
            <a href="#contact">Talk to an advisor <Arrow /></a>
          </div>
        </div>
        <nav className="container nav" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="ByteLab Academy home">
            <span className="brand-mark">BL</span>
            <span className="brand-copy">
              <strong>ByteLab</strong>
              <small>Academy</small>
            </span>
          </a>

          <button
            className="menu-button"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
          </button>

          <div className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#courses" onClick={() => setMenuOpen(false)}>Courses</a>
            <a href="#experience" onClick={() => setMenuOpen(false)}>Learning</a>
            <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
            <a href="#about" onClick={() => setMenuOpen(false)}>About</a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>Contact</a>
          </div>

          <div className="nav-actions">
            {user ? (
              <button className="account-button" onClick={() => setAccountOpen(true)}>
                <span>{user.email.slice(0, 1).toUpperCase()}</span>
                My account
              </button>
            ) : (
              <>
                <button className="button button-ghost" onClick={() => openAuth("signin")}>Sign in</button>
                <button className="button button-primary" onClick={() => openAuth("signup")}>Create account</button>
              </>
            )}
          </div>
        </nav>
      </header>

      <section id="top" className="hero">
        <div className="hero-grid container">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Learn practical technology skills</p>
            <h1>Build the skills to create your <em>next opportunity.</em></h1>
            <p className="hero-lead">
              Career-focused programmes in software, AI, cybersecurity and digital skills—built around practical projects and clear guidance.
            </p>
            <div className="hero-actions">
              <a className="button button-primary button-large" href="#courses">Explore courses <Arrow /></a>
              <a className="text-link" href="#experience">How learning works <span>↓</span></a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>PK</span><span>MV</span><span>AJ</span>
              </div>
              <p><strong>Project-led learning</strong><br />Support from registration to completion</p>
            </div>
          </div>

          <div className="hero-visual" aria-label="ByteLab Academy learning dashboard illustration">
            <div className="visual-glow" />
            <div className="code-card">
              <div className="code-top"><span /><span /><span /><small>academy-project.js</small></div>
              <div className="code-lines" aria-hidden="true">
                <p><b>01</b><span className="pink">const</span> learner = &#123;</p>
                <p><b>02</b>&nbsp;&nbsp;curiosity: <span className="amber">true</span>,</p>
                <p><b>03</b>&nbsp;&nbsp;skills: [<span className="green">&quot;code&quot;</span>, <span className="green">&quot;create&quot;</span>],</p>
                <p><b>04</b>&nbsp;&nbsp;future: <span className="green">&quot;in progress&quot;</span></p>
                <p><b>05</b>&#125;;</p>
                <p><b>06</b></p>
                <p><b>07</b><span className="pink">function</span> <span className="cyan">buildFuture</span>() &#123;</p>
                <p><b>08</b>&nbsp;&nbsp;<span className="pink">return</span> practice + guidance;</p>
                <p><b>09</b>&#125;</p>
              </div>
            </div>
            <div className="floating-card course-progress">
              <p>Course progress</p>
              <strong>68%</strong>
              <span><i style={{ width: "68%" }} /></span>
            </div>
            <div className="floating-card live-session">
              <span className="live-dot" />
              <div><small>Live practical</small><strong>Starts at 6:00 PM</strong></div>
            </div>
            <div className="floating-badge">&lt;/&gt;</div>
          </div>
        </div>
        <div className="hero-bottom container">
          <p>Designed for ambitious learners in Uganda and beyond</p>
          <div><span>LIVE CLASSES</span><span>REAL PROJECTS</span><span>MENTOR SUPPORT</span><span>FLEXIBLE LEARNING</span></div>
        </div>
      </section>

      <section id="courses" className="section courses-section">
        <div className="container">
          <div className="section-heading split-heading">
            <div>
              <p className="eyebrow red"><span /> Choose your direction</p>
              <h2>Courses that turn learning into capability.</h2>
            </div>
            <p>Browse a focused selection of programmes designed around practical outcomes, clear milestones and work you can demonstrate.</p>
          </div>

          <div className="course-tools">
            <label className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search courses or skills"
                aria-label="Search courses"
              />
            </label>
            <div className="category-tabs" aria-label="Course categories">
              {courseCategories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="course-grid">
            {visibleCourses.map((course, index) => (
              <article className={`course-card accent-${course.accent}`} key={course.id}>
                <div className="course-number">0{index + 1}</div>
                <div className="course-card-top">
                  <span className="course-category">{course.category}</span>
                  {course.featured && <span className="featured-label">Popular</span>}
                </div>
                <h3>{course.title}</h3>
                <p>{course.summary}</p>
                <div className="course-meta">
                  <span>{course.duration}</span>
                  <span>{course.level}</span>
                </div>
                <div className="course-card-actions">
                  <button className="course-link" onClick={() => setSelectedCourse(course)}>View course <Arrow /></button>
                  <button className="mini-enroll" onClick={() => beginEnrollment(course)}>Enroll</button>
                </div>
              </article>
            ))}
          </div>
          {!visibleCourses.length && (
            <div className="empty-state"><strong>No matching courses</strong><p>Try a different course name or category.</p></div>
          )}
        </div>
      </section>

      <section id="experience" className="section experience-section">
        <div className="container experience-grid">
          <div className="experience-copy">
            <p className="eyebrow light"><span /> The ByteLab method</p>
            <h2>Learn it. Build it. Explain it.</h2>
            <p>We move beyond watching lessons. Every programme combines guided learning, repeated practice and a completed project.</p>
            <div className="method-list">
              <div><b>01</b><span><strong>Understand the foundation</strong><small>Clear explanations before complicated tools.</small></span></div>
              <div><b>02</b><span><strong>Practise with guidance</strong><small>Structured tasks, feedback and correction.</small></span></div>
              <div><b>03</b><span><strong>Build something real</strong><small>A final project that demonstrates your capability.</small></span></div>
            </div>
          </div>
          <div className="experience-panel">
            <div className="panel-label">Your learning week</div>
            <div className="week-row active"><span>MON</span><div><strong>Concept lesson</strong><small>Live online · 6:00 PM</small></div><b>45 min</b></div>
            <div className="week-row"><span>WED</span><div><strong>Guided practical</strong><small>Project laboratory</small></div><b>90 min</b></div>
            <div className="week-row"><span>FRI</span><div><strong>Review & feedback</strong><small>Mentor check-in</small></div><b>45 min</b></div>
            <div className="project-strip"><span>WEEKLY OUTPUT</span><strong>One completed practical milestone</strong></div>
          </div>
        </div>
      </section>

      <section id="services" className="section services-section">
        <div className="container">
          <div className="section-heading centered-heading">
            <p className="eyebrow red"><span /> More than courses</p>
            <h2>Support for learners, teams and institutions.</h2>
          </div>
          <div className="service-grid">
            <article><span className="service-icon">01</span><h3>Career-focused training</h3><p>Structured programmes for learners building practical technology capability.</p><a href="#courses">Browse programmes <Arrow /></a></article>
            <article><span className="service-icon">02</span><h3>Team workshops</h3><p>Focused digital-skills and productivity workshops for organisations and teams.</p><a href="#contact">Plan a workshop <Arrow /></a></article>
            <article><span className="service-icon">03</span><h3>Project mentorship</h3><p>Guidance for student, startup and institutional software projects from idea to delivery.</p><a href="#contact">Request mentorship <Arrow /></a></article>
          </div>
        </div>
      </section>

      <section id="about" className="section about-section">
        <div className="container about-grid">
          <div className="about-mark"><span>BL</span><small>BEYOND<br />CODE.</small></div>
          <div className="about-copy">
            <p className="eyebrow"><span /> About the academy</p>
            <h2>Technology education built for practical progress.</h2>
            <p>ByteLab Academy is the learning and training arm of ByteLab Uganda Ltd. We help learners understand modern technology, use it responsibly and turn knowledge into useful systems, products and opportunities.</p>
            <div className="values-row">
              <div><strong>Practical</strong><small>Learn by building</small></div>
              <div><strong>Responsible</strong><small>Use technology well</small></div>
              <div><strong>Progressive</strong><small>Keep improving</small></div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="section contact-section">
        <div className="container contact-card">
          <div>
            <p className="eyebrow light"><span /> Your next step</p>
            <h2>Not sure which course fits your goal?</h2>
            <p>Speak with the ByteLab Academy admissions team and get guidance before you enroll.</p>
          </div>
          <div className="contact-actions">
            <a className="button button-white button-large" href="mailto:official.bytelab.ug@gmail.com">Email admissions <Arrow /></a>
            <small>official.bytelab.ug@gmail.com</small>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-grid">
          <div><a className="brand footer-brand" href="#top"><span className="brand-mark">BL</span><span className="brand-copy"><strong>ByteLab</strong><small>Academy</small></span></a><p>{appConfig.tagline}</p></div>
          <div><strong>Explore</strong><a href="#courses">Courses</a><a href="#experience">How learning works</a><a href="#services">Services</a></div>
          <div><strong>Academy</strong><a href="#about">About</a><button onClick={() => openAuth("signin")}>Student sign in</button><button onClick={() => openAuth("signup")}>Create account</button></div>
          <div><strong>Contact</strong><a href="mailto:official.bytelab.ug@gmail.com">Admissions email</a><span>Kampala, Uganda</span></div>
        </div>
        <div className="container footer-bottom"><span>© 2026 ByteLab Uganda Ltd. All rights reserved.</span><span>Beyond Code.</span></div>
      </footer>

      {selectedCourse && (
        <CourseModal course={selectedCourse} onClose={() => setSelectedCourse(null)} onEnroll={beginEnrollment} />
      )}
      {authOpen && (
        <AuthModal
          view={authView}
          setView={setAuthView}
          currentUser={user}
          onClose={() => { setAuthOpen(false); setPendingCourse(null); }}
          onAuthenticated={finishAuth}
          onUserChange={setUser}
          pendingCourse={pendingCourse}
          notify={setToast}
        />
      )}
      {enrollmentCourse && user && (
        <EnrollmentModal
          course={enrollmentCourse}
          user={user}
          onClose={() => setEnrollmentCourse(null)}
          onSuccess={(message) => { setEnrollmentCourse(null); setToast(message); }}
        />
      )}
      {accountOpen && user && (
        <div className="modal-shell account-shell" role="dialog" aria-modal="true" aria-label="Student account">
          <button className="modal-backdrop" onClick={() => setAccountOpen(false)} aria-label="Close account" />
          <aside className="account-panel">
            <button className="modal-close" onClick={() => setAccountOpen(false)} aria-label="Close">×</button>
            <div className="account-avatar">{user.email.slice(0, 1).toUpperCase()}</div>
            <p className="eyebrow"><span /> Student account</p>
            <h2>{user.email}</h2>
            <div className={`verification-status ${user.emailVerified ? "verified" : ""}`}>
              <span>{user.emailVerified ? "✓" : "!"}</span>
              <div><strong>{user.emailVerified ? "Email verified" : "Verification required"}</strong><small>{user.emailVerified ? "Your account can submit enrollments." : "Verify your email before enrolling."}</small></div>
            </div>
            <button className="button button-primary button-full" onClick={() => { setAccountOpen(false); document.querySelector("#courses")?.scrollIntoView({ behavior: "smooth" }); }}>Browse courses</button>
            <button className="button button-outline button-full" onClick={signOut}>Sign out</button>
          </aside>
        </div>
      )}
      {toast && <div className="toast" role="status"><Check />{toast}</div>}
    </main>
  );
}

function CourseModal({ course, onClose, onEnroll }: { course: Course; onClose: () => void; onEnroll: (course: Course) => void }) {
  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="course-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close course details" />
      <section className="modal-card course-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className={`course-modal-hero accent-${course.accent}`}>
          <span className="course-category">{course.category}</span>
          <h2 id="course-title">{course.title}</h2>
          <p>{course.description}</p>
          <div className="course-summary-grid">
            <div><small>Duration</small><strong>{course.duration}</strong></div>
            <div><small>Delivery</small><strong>{course.delivery}</strong></div>
            <div><small>Level</small><strong>{course.level}</strong></div>
            <div><small>Schedule</small><strong>{course.schedule}</strong></div>
          </div>
        </div>
        <div className="course-modal-body">
          <div className="course-detail-main">
            <h3>What you will study</h3>
            <ol>{course.modules.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
          </div>
          <aside className="course-detail-side">
            <h3>What you will achieve</h3>
            <ul>{course.outcomes.map((item) => <li key={item}><Check />{item}</li>)}</ul>
            <h3>Requirements</h3>
            <ul className="requirements">{course.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className="fee-box"><small>Course fee</small><strong>{course.fee}</strong></div>
            <button className="button button-primary button-full button-large" onClick={() => onEnroll(course)}>Enroll in this course <Arrow /></button>
          </aside>
        </div>
      </section>
    </div>
  );
}

function AuthModal({ view, setView, currentUser, onClose, onAuthenticated, onUserChange, pendingCourse, notify }: {
  view: AuthView;
  setView: (view: AuthView) => void;
  currentUser: AuthUser | null;
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
  onUserChange: (user: AuthUser) => void;
  pendingCourse: Course | null;
  notify: (message: string) => void;
}) {
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "signup") {
        if (password.length < 8) throw new Error("Use at least eight characters for your password.");
        if (password !== confirmPassword) throw new Error("The two passwords do not match.");
        const nextUser = await signUp(email.trim().toLowerCase(), password);
        onAuthenticated(nextUser);
      } else if (view === "signin") {
        const nextUser = await signIn(email.trim().toLowerCase(), password);
        onAuthenticated(nextUser);
      } else if (view === "reset") {
        await sendPasswordReset(email.trim().toLowerCase());
        notify("Password reset instructions have been sent to your email.");
        setView("signin");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function checkVerification() {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const nextUser = await reloadUser(currentUser);
      onUserChange(nextUser);
      if (nextUser.emailVerified) onAuthenticated(nextUser);
      else setError("Your email is not verified yet. Open the link in your inbox, then try again.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verification could not be checked.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAgain() {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      await resendVerification(currentUser);
      notify("A new verification email has been sent.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The email could not be sent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close account window" />
      <section className="modal-card auth-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="auth-brand"><span className="brand-mark">BL</span><strong>ByteLab Academy</strong></div>
        {pendingCourse && <div className="pending-course"><span>Selected course</span><strong>{pendingCourse.title}</strong></div>}

        {view === "verify" ? (
          <div className="verify-view">
            <div className="mail-symbol">@</div>
            <p className="eyebrow red"><span /> One final step</p>
            <h2 id="auth-title">Verify your email</h2>
            <p>We sent a verification link to <strong>{currentUser?.email}</strong>. Open it, then return here to continue.</p>
            {error && <div className="form-error">{error}</div>}
            <button className="button button-primary button-full button-large" disabled={loading} onClick={checkVerification}>{loading ? "Checking…" : "I have verified my email"}</button>
            <button className="text-button" disabled={loading} onClick={sendAgain}>Send the verification email again</button>
          </div>
        ) : (
          <>
            <p className="eyebrow red"><span /> Student access</p>
            <h2 id="auth-title">{view === "signup" ? "Create your account" : view === "reset" ? "Reset your password" : "Welcome back"}</h2>
            <p className="auth-intro">{view === "signup" ? "Use any valid email address to create your ByteLab Academy account." : view === "reset" ? "We will email you a secure password-reset link." : "Sign in to continue learning or enroll in a course."}</p>
            <form onSubmit={submit} className="auth-form">
              <label><span>Email address</span><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
              {view !== "reset" && <label><span>Password</span><input type="password" required minLength={8} autoComplete={view === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>}
              {view === "signup" && <label><span>Confirm password</span><input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></label>}
              {error && <div className="form-error">{error}</div>}
              <button className="button button-primary button-full button-large" disabled={loading}>{loading ? "Please wait…" : view === "signup" ? "Create account" : view === "reset" ? "Send reset link" : "Sign in"}</button>
            </form>
            <div className="auth-switch">
              {view === "signin" && <><button onClick={() => setView("reset")}>Forgot password?</button><p>New to the academy? <button onClick={() => setView("signup")}>Create an account</button></p></>}
              {view === "signup" && <p>Already have an account? <button onClick={() => setView("signin")}>Sign in</button></p>}
              {view === "reset" && <button onClick={() => setView("signin")}>← Return to sign in</button>}
            </div>
          </>
        )}
        <p className="privacy-note">Your password is handled securely and is never stored in the academy spreadsheet.</p>
      </section>
    </div>
  );
}

function EnrollmentModal({ course, user, onClose, onSuccess }: { course: Course; user: AuthUser; onClose: () => void; onSuccess: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const result = await submitEnrollment(user.idToken, {
        courseId: course.id,
        courseTitle: course.title,
        fullName: String(form.get("fullName") ?? ""),
        age: Number(form.get("age")),
        phone: String(form.get("phone") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
        district: String(form.get("district") ?? ""),
        education: String(form.get("education") ?? ""),
        occupation: String(form.get("occupation") ?? ""),
        learningMode: String(form.get("learningMode") ?? ""),
        experience: String(form.get("experience") ?? ""),
        goals: String(form.get("goals") ?? ""),
        consent: form.get("consent") === "on",
        website: String(form.get("website") ?? ""),
      });
      onSuccess(`Enrollment received. Your reference is ${result.enrollmentId}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Enrollment could not be submitted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-shell" role="dialog" aria-modal="true" aria-labelledby="enroll-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close enrollment form" />
      <section className="modal-card enrollment-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="enrollment-header">
          <div><p className="eyebrow light"><span /> Course application</p><h2 id="enroll-title">Complete your enrollment</h2><p>{course.title}</p></div>
          <div className="enrollment-step"><small>Signed in as</small><strong>{user.email}</strong></div>
        </div>
        <form className="enrollment-form" onSubmit={submit}>
          <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <fieldset><legend><span>01</span>Personal information</legend><div className="form-grid">
            <label className="field-wide"><span>Full name</span><input name="fullName" required minLength={3} maxLength={100} placeholder="Enter your full legal name" /></label>
            <label><span>Age</span><input name="age" type="number" required min={13} max={100} placeholder="e.g. 23" /></label>
            <label><span>District</span><input name="district" required minLength={2} maxLength={60} placeholder="e.g. Kampala" /></label>
            <label><span>Primary phone number</span><input name="phone" type="tel" required minLength={9} maxLength={20} placeholder="e.g. +256 700 000000" /></label>
            <label><span>WhatsApp number</span><input name="whatsapp" type="tel" maxLength={20} placeholder="If different from primary number" /></label>
          </div></fieldset>
          <fieldset><legend><span>02</span>Education and experience</legend><div className="form-grid">
            <label><span>Highest education level</span><select name="education" required defaultValue=""><option value="" disabled>Select your level</option><option>Primary</option><option>O-Level</option><option>A-Level</option><option>Certificate</option><option>Diploma</option><option>Bachelor&apos;s degree</option><option>Postgraduate</option><option>Other</option></select></label>
            <label><span>Current occupation</span><select name="occupation" required defaultValue=""><option value="" disabled>Select your status</option><option>Secondary school student</option><option>University student</option><option>Employed</option><option>Self-employed</option><option>Looking for work</option><option>Other</option></select></label>
            <label><span>Preferred learning mode</span><select name="learningMode" required defaultValue=""><option value="" disabled>Select a mode</option><option>Online</option><option>Physical</option><option>Hybrid</option></select></label>
            <label><span>Current experience</span><select name="experience" required defaultValue=""><option value="" disabled>Select your experience</option><option>Complete beginner</option><option>Some basic knowledge</option><option>Have completed small projects</option><option>Already working in the field</option></select></label>
            <label className="field-wide"><span>What do you want to achieve?</span><textarea name="goals" required minLength={20} maxLength={800} rows={4} placeholder="Tell us what you want to learn or build through this course." /></label>
          </div></fieldset>
          <label className="consent-field"><input type="checkbox" name="consent" required /><span>I confirm that the information is correct and allow ByteLab Academy to contact me about this application.</span></label>
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions"><button type="button" className="button button-outline" onClick={onClose}>Save for later</button><button className="button button-primary button-large" disabled={loading}>{loading ? "Submitting…" : "Submit enrollment"} <Arrow /></button></div>
        </form>
      </section>
    </div>
  );
}
