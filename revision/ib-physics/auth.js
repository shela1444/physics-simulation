/* Username/password auth, class membership, roster lookup, and attempt saving. */
(function () {
  "use strict";

  const PENDING_PREFIX = "ib-pending-attempts-v1:";
  const rawConfig = window.QUIZ_CONFIG || {};
  const supabaseUrl = String(rawConfig.SUPABASE_URL || "").trim();
  const supabaseKey = String(rawConfig.SUPABASE_ANON_KEY || "").trim();
  const schoolDomain = String(rawConfig.SCHOOL_DOMAIN || "").trim().replace(/^@/, "").toLowerCase();
  const studentEmailDomain = String(rawConfig.STUDENT_EMAIL_DOMAIN || "").trim().replace(/^@/, "").toLowerCase();
  const teacherEmail = String(rawConfig.TEACHER_EMAIL || "").trim().toLowerCase();

  const configured =
    /^https?:\/\//.test(supabaseUrl) &&
    supabaseKey.length > 20 &&
    studentEmailDomain.includes(".") &&
    !/your-school/i.test(studentEmailDomain);

  let client = null;
  let initPromise = null;
  let currentState = null;

  function errorMessage(error, fallback) {
    return (error && (error.message || error.error_description)) || fallback;
  }

  function init() {
    if (!configured) {
      return Promise.resolve({ status: "unconfigured", message: "Accounts are not configured yet." });
    }
    if (client) return Promise.resolve({ status: "ready" });
    if (initPromise) return initPromise;

    initPromise = (async () => {
      if (!window.supabase || typeof window.supabase.createClient !== "function") {
        return { status: "error", message: "The Supabase client library did not load. Check the network and reload." };
      }
      try {
        client = window.supabase.createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        });
        client.auth.onAuthStateChange(() => {
          window.dispatchEvent(new CustomEvent("quiz-auth-changed"));
        });
        return { status: "ready" };
      } catch (error) {
        client = null;
        return { status: "error", message: errorMessage(error, "Could not start the account service.") };
      }
    })();
    return initPromise;
  }

  function normalizeIdentifier(value) {
    let identifier = String(value || "").trim().toLowerCase();
    if (!identifier) return "";
    if (!identifier.includes("@")) identifier += "@" + studentEmailDomain;
    return identifier;
  }

  async function getSession() {
    const ready = await init();
    if (ready.status !== "ready") return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function signIn(identifier, password) {
    const ready = await init();
    if (ready.status !== "ready") throw new Error(ready.message || "Sign-in is not configured.");
    const email = normalizeIdentifier(identifier);
    if (!email || !password) throw new Error("Enter your username/email and password.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(errorMessage(error, "Could not sign in."));
    currentState = null;
    return data;
  }

  async function signOut() {
    currentState = null;
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function fetchProfile(userId) {
    const { data, error } = await client.from("profiles")
      .select("id, display_name, role").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function fetchRoster(userId) {
    const { data, error } = await client.from("roster_students")
      .select("id, class_id, display_name, username")
      .eq("auth_user_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function fetchMembership(userId) {
    const { data, error } = await client.from("class_members")
      .select("class_id, joined_at").eq("student_id", userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function getState() {
    const ready = await init();
    if (ready.status !== "ready") {
      currentState = ready;
      return ready;
    }

    let session;
    try {
      session = await getSession();
    } catch (error) {
      currentState = { status: "error", message: errorMessage(error, "Could not read the session.") };
      return currentState;
    }

    if (!session || !session.user) {
      currentState = { status: "signed_out" };
      return currentState;
    }

    try {
      const profile = await fetchProfile(session.user.id);
      if (!profile) {
        currentState = { status: "error", message: "Your profile has not been created. Ask the teacher to run the Supabase schema." };
        return currentState;
      }
      if (profile.role === "teacher") {
        currentState = { status: "teacher", user: session.user, profile };
        return currentState;
      }
      if (profile.role !== "student") {
        currentState = { status: "error", message: "This account has an unrecognised role." };
        return currentState;
      }

      const roster = await fetchRoster(session.user.id);
      if (!roster) {
        currentState = {
          status: "unlinked",
          user: session.user,
          profile,
          message: "Your account is not linked to a 6IB roster name. Ask your teacher."
        };
        return currentState;
      }

      const membership = await fetchMembership(session.user.id);
      currentState = {
        status: "student",
        user: session.user,
        profile,
        roster,
        membership: membership || { class_id: roster.class_id }
      };
      flushPending().catch(() => {});
      return currentState;
    } catch (error) {
      currentState = { status: "error", message: errorMessage(error, "Could not load your account.") };
      return currentState;
    }
  }

  function queueKey(userId) { return PENDING_PREFIX + userId; }
  function readQueue(userId) {
    try {
      const value = JSON.parse(localStorage.getItem(queueKey(userId)) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }
  function writeQueue(userId, items) {
    try {
      if (items.length) localStorage.setItem(queueKey(userId), JSON.stringify(items));
      else localStorage.removeItem(queueKey(userId));
    } catch (_) {}
  }
  function queueAttempt(userId, payload) {
    const queue = readQueue(userId).filter((item) => item.client_attempt_id !== payload.client_attempt_id);
    queue.push(payload);
    writeQueue(userId, queue);
  }

  async function saveAttemptPayload(payload) {
    const { error } = await client.from("attempts").upsert(payload, {
      onConflict: "client_attempt_id", ignoreDuplicates: true
    });
    if (error) throw error;
  }

  async function recordAttempt(attempt) {
    const ready = await init();
    if (ready.status !== "ready") return { ok: false, queued: true, message: "Accounts are not configured." };
    const state = currentState && currentState.status === "student" ? currentState : await getState();
    if (state.status !== "student") {
      return { ok: false, queued: false, message: "This attempt was not saved because you are not signed in." };
    }

    const payload = {
      client_attempt_id: String(attempt.clientAttemptId || ""),
      student_id: state.user.id,
      class_id: state.membership.class_id,
      level: attempt.level,
      mode: attempt.mode,
      selection: attempt.selection,
      total_questions: Number(attempt.totalQuestions),
      correct_count: Number(attempt.correctCount),
      almost_count: Number(attempt.almostCount),
      learn_count: Number(attempt.learnCount),
      duration_seconds: Math.max(0, Math.round(Number(attempt.durationSeconds) || 0)),
      started_at: attempt.startedAt,
      completed_at: attempt.completedAt
    };

    try {
      await saveAttemptPayload(payload);
      return { ok: true, queued: false };
    } catch (error) {
      queueAttempt(state.user.id, payload);
      return { ok: false, queued: true, message: errorMessage(error, "Saved locally; will retry.") };
    }
  }

  async function flushPending() {
    if (!client || !currentState || currentState.status !== "student") return { sent: 0, remaining: 0 };
    const userId = currentState.user.id;
    const queue = readQueue(userId);
    if (!queue.length) return { sent: 0, remaining: 0 };
    const remaining = [];
    let sent = 0;
    for (const payload of queue) {
      try { await saveAttemptPayload(payload); sent += 1; }
      catch (_) { remaining.push(payload); }
    }
    writeQueue(userId, remaining);
    return { sent, remaining: remaining.length };
  }

  function newAttemptId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  window.QuizAuth = {
    configured,
    schoolDomain,
    studentEmailDomain,
    teacherEmail,
    normalizeIdentifier,
    init,
    getClient: () => client,
    getState: () => getState(),
    getCachedState: () => currentState,
    signIn,
    signOut,
    recordAttempt,
    flushPending,
    newAttemptId
  };
})();
