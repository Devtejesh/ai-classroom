
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:8081/api";
const AI_ENGINE_URL = "http://localhost:8000/api";

type User = {
  id?: number;
  name: string;
  email: string;
  role?: string;
  is_verified?: boolean;
};

type AuthMode = "login" | "register";
type Page = "Home" | "My Learning" | "Library" | "Analytics" | "Settings";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

const SUPPORTED_LANGUAGES = ["English", "Telugu", "Hindi"];

function getYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }

      const parts = parsed.pathname.split("/");

      if (["embed", "shorts", "live"].includes(parts[1])) {
        return parts[2] || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function getLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    English: "en",
    Telugu: "te",
    Hindi: "hi",
  };

  return languageMap[language] || "en";
}

function getVoiceTestText(language: string): string {
  const samples: Record<string, string> = {
    English:
      "Hello! Welcome to AI Classroom. I am your personal AI tutor. Let's learn something new today.",

    Telugu:
      "నమస్కారం! ఏఐ క్లాస్‌రూమ్‌కు స్వాగతం. నేను మీ వ్యక్తిగత ఏఐ టీచర్‌ని. ఈరోజు కొత్త విషయాలు నేర్చుకుందాం.",

    Hindi:
      "नमस्ते! एआई क्लासरूम में आपका स्वागत है। मैं आपका व्यक्तिगत एआई शिक्षक हूँ। आइए आज कुछ नया सीखते हैं।",
  };

  return samples[language] || samples.English;
}

function App() {
  const [page, setPage] = useState<Page>("Home");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [showAuth, setShowAuth] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState(
    localStorage.getItem("ai_classroom_token") || ""
  );

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [transcriptSegments, setTranscriptSegments] = useState<
  Array<{ start: number; end: number; text: string }>
>([]);
  const [videoError, setVideoError] = useState("");

  const [language, setLanguage] = useState("English");

  const [tutorName, setTutorName] = useState(
    localStorage.getItem("ai_tutor_name") || "Your AI Tutor"
  );

  const [activeTutorTab, setActiveTutorTab] = useState("Suggestions");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! I'm here to help you understand your lessons. What would you like to learn today?",
    },
  ]);

  const [chatNotice, setChatNotice] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  // AI Tutor voice states
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session expired");

        const data = await response.json();
        setUser(data.user || data);
      })
      .catch(() => {
        localStorage.removeItem("ai_classroom_token");
        setToken("");
        setUser(null);
      });
  }, [token]);

  // Release old audio URLs when replaced or component unmounts.
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function handleAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthError("");
    setAuthMessage("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";

      const payload =
        authMode === "register"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Authentication failed. Please try again."
        );
      }

      if (authMode === "register") {
        setOtp("");
        setOtpStep(true);
        setAuthMessage(
          data.message || "Verification OTP sent to your email."
        );
        setPassword("");
        return;
      }

      const newToken = data.token;

      if (!newToken) {
        throw new Error("Login response did not contain a JWT token.");
      }

      localStorage.setItem("ai_classroom_token", newToken);

      setToken(newToken);
      setUser(data.user || {
        name: email.split("@")[0],
        email,
      });

      setShowAuth(false);
      setPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function resendOTP() {
    setAuthError("");
    setAuthMessage("");

    if (!email.trim()) {
      setAuthError(
        "Please enter your registered email address first."
      );
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Unable to send OTP."
        );
      }

      setOtp("");
      setOtpStep(true);
      setAuthMessage(
        data.message || "A new verification OTP has been sent."
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to send OTP."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function verifyOTP(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthError("");
    setAuthMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setAuthError("Please enter the valid 6-digit OTP.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "OTP verification failed."
        );
      }

      setOtpStep(false);
      setOtp("");
      setAuthMode("login");
      setPassword("");
      setAuthError("");

      setAuthMessage(
        data.message ||
          "Email verified successfully. You can now log in."
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "OTP verification failed."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ai_classroom_token");

    setToken("");
    setUser(null);
    setShowAuth(false);
    setPage("Home");
  }

async function loadLesson(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setVideoError("");

  const id = getYouTubeId(videoUrl.trim());

  if (!id) {
    setVideoError("Please enter a valid YouTube video URL.");
    return;
  }

  setVideoId(id);
  setTranscriptSegments([]);

  const targetLanguage =
    language === "Telugu" ? "te" :
    language === "Hindi" ? "hi" : "en";

  try {
    const response = await fetch(
      `${AI_ENGINE_URL}/youtube/transcript`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  url: videoUrl.trim(),
}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to process this YouTube lesson."
      );
    }

    if (!data.success || !Array.isArray(data.segments)) {
      throw new Error("Transcript was not returned by AI Engine.");
    }

    setTranscriptSegments(data.segments);

    setHistory((previous) => [
      `YouTube lesson – ${new Date().toLocaleDateString()}`,
      ...previous,
    ]);

    setChatNotice(
      `Lesson transcript ready in ${language}. You can ask your AI Tutor questions.`
    );

  } catch (error) {
    setVideoError(
      error instanceof Error
        ? error.message
        : "Unable to load lesson transcript."
    );
  }
}

async function sendMessage(text = chatInput) {
  const value = text.trim();

  if (!value || chatLoading) return;

  setMessages((previous) => [
    ...previous,
    { role: "user", text: value },
  ]);

  setChatInput("");
  setChatNotice("AI Tutor is thinking...");
  setChatLoading(true);

  try {
    const response = await fetch(`${AI_ENGINE_URL}/tutor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: value,
        segments: transcriptSegments,
        target_language: getLanguageCode(language),
      }),
    });

    const data: {
      answer?: string;
      detail?: string;
    } = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "AI Tutor request failed.");
    }

    const answer = data.answer?.trim();

    if (!answer) {
      throw new Error("AI Tutor returned an empty answer.");
    }

    // Display AI Tutor answer
    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        text: answer,
      },
    ]);

    // Automatically generate and play voice
    await testTutorVoice(answer);

  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to connect to AI Tutor.";

    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        text: `Sorry, ${errorMessage}`,
      },
    ]);

    setChatNotice("AI Tutor request failed.");
  } finally {
    setChatLoading(false);
  }
}


async function testTutorVoice(text: string) {
  setVoiceError("");
  setChatNotice("");

  if (voiceLoading || !text.trim()) return;

  setVoiceLoading(true);

  try {
    const response = await fetch(
      `${AI_ENGINE_URL}/tutor/speak`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: "Kore",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Speech API failed (${response.status}): ${errorText.slice(0, 300)}`
      );
    }

    const blob = await response.blob();

    if (blob.size <= 44) {
      throw new Error("AI Engine returned an empty audio file.");
    }

    const newAudioUrl = URL.createObjectURL(blob);

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioUrl(newAudioUrl);

    const audio = new Audio(newAudioUrl);
    await audio.play();

    setChatNotice("AI Tutor is speaking...");
  } catch (error) {
    setVoiceError(
      error instanceof Error
        ? error.message
        : "Unable to play tutor voice."
    );
  } finally {
    setVoiceLoading(false);
  }
}


  function saveNote() {
    if (!videoId) {
      setChatNotice("Load a lesson first to save lesson notes.");
      return;
    }

    setSavedNotes((previous) => [
      `Notes for lesson ${videoId} – ${new Date().toLocaleString()}`,
      ...previous,
    ]);

    setChatNotice("Lesson note saved in this session.");
  }

  function changeTutorName(value: string) {
    setTutorName(value);
    localStorage.setItem("ai_tutor_name", value);
  }

  const navItems: { label: Page; icon: string }[] = [
    { label: "Home", icon: "⌂" },
    { label: "My Learning", icon: "▷" },
    { label: "Library", icon: "▤" },
    { label: "Analytics", icon: "▥" },
  ];

  if (showAuth) {
    return (
      <div className="auth-screen">
        <div className="auth-glow auth-glow-one" />
        <div className="auth-glow auth-glow-two" />

        <button
          className="auth-back"
          onClick={() => {
            setShowAuth(false);
            setOtpStep(false);
            setAuthError("");
            setAuthMessage("");
          }}
        >
          ← Back to classroom
        </button>

        <div className="auth-card">
          <div className="brand-mark auth-brand-mark">✧</div>
          <div className="brand-title">AI CLASSROOM</div>
          <p className="brand-subtitle">Learn · Understand · Grow</p>

          {otpStep ? (
            <>
              <div className="auth-heading">
                <span className="eyebrow">EMAIL VERIFICATION</span>
                <h1>Verify Your Email</h1>
                <p>
                  Enter the 6-digit verification code sent to {email}.
                </p>
              </div>

              <form className="auth-form otp-form" onSubmit={verifyOTP}>
                <label>
                  6-digit OTP
                  <input
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    placeholder="Enter 6-digit OTP"
                    required
                  />
                </label>

                {authError && (
                  <div className="form-alert error">{authError}</div>
                )}

                {authMessage && (
                  <div className="form-alert success">{authMessage}</div>
                )}

                <button
                  className="primary-button auth-submit"
                  disabled={authLoading}
                >
                  {authLoading ? "Verifying..." : "Verify Email →"}
                </button>
              </form>

              <button
                className="otp-resend-button"
                onClick={resendOTP}
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : "Didn't receive the code? Resend OTP"}
              </button>

              <button
                className="otp-back-button"
                onClick={() => {
                  setOtpStep(false);
                  setOtp("");
                  setAuthError("");
                  setAuthMessage("");
                  setAuthMode("login");
                }}
              >
                Back to Login
              </button>
            </>
          ) : (
            <>
              <div className="auth-heading">
                <span className="eyebrow">
                  YOUR PERSONAL LEARNING SPACE
                </span>

                <h1>
                  {authMode === "login"
                    ? "Welcome Back!"
                    : "Create Account"}
                </h1>

                <p>
                  {authMode === "login"
                    ? "Sign in to continue your learning journey."
                    : "Join AI Classroom and start learning smarter."}
                </p>
              </div>

              <div className="auth-tabs">
                <button
                  className={authMode === "login" ? "active" : ""}
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  Login
                </button>

                <button
                  className={authMode === "register" ? "active" : ""}
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                    setAuthMessage("");
                  }}
                >
                  Register
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuth}>
                {authMode === "register" && (
                  <label>
                    Full name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your full name"
                      required
                      minLength={2}
                    />
                  </label>
                )}

                <label>
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <label>
                  Password
                  <div className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      required
                      minLength={8}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {authError && (
                  <div className="form-alert error">{authError}</div>
                )}

                {authMessage && (
                  <div className="form-alert success">{authMessage}</div>
                )}

                <button
                  className="primary-button auth-submit"
                  disabled={authLoading}
                >
                  {authLoading
                    ? "Please wait..."
                    : authMode === "login"
                      ? "Sign In →"
                      : "Create Account →"}
                </button>
              </form>

              {authMode === "login" && (
                <button
                  className="otp-resend-button"
                  onClick={resendOTP}
                  disabled={authLoading}
                >
                  Resend verification OTP
                </button>
              )}

              <p className="auth-footer">
                By continuing, you agree to use AI Classroom responsibly.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">✧</div>

        <nav className="side-navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                page === item.label ? "selected" : ""
              }`}
              onClick={() => setPage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => setPage("Settings")}
          >
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="brand-lockup">
            <div className="brand-mark">✧</div>

            <div>
              <div className="brand-title">AI CLASSROOM</div>
              <div className="brand-subtitle">
                Learn · Understand · Grow
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <span className="online-status">
              <i /> Online
            </span>

            <button
              className="icon-button"
              title="Settings"
              onClick={() => setPage("Settings")}
            >
              ⚙
            </button>

            {user ? (
              <button
                className="user-avatar"
                title={user.name}
                onClick={logout}
              >
                {user.name?.charAt(0).toUpperCase() || "U"}
              </button>
            ) : (
              <div className="top-auth-actions">
                <button
                  className="text-button"
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuth(true);
                  }}
                >
                  Login
                </button>

                <button
                  className="small-primary"
                  onClick={() => {
                    setAuthMode("register");
                    setShowAuth(true);
                  }}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="workspace">
          {page === "Home" && (
            <>
              <section className="welcome-row">
                <div>
                  <span className="eyebrow">
                    YOUR PERSONAL LEARNING SPACE
                  </span>

                  <h1>
                    Welcome{" "}
                    <span>
                      {user?.name
                        ? user.name.split(" ")[0]
                        : "Back"}
                      !
                    </span>
                  </h1>

                  <p>
                    Your personalized AI learning companion is ready to
                    help you learn better.
                  </p>
                </div>

                <label className="language-select">
                  <span>◎</span>

                  <select
                    value={language}
                    onChange={(event) => {
                      setLanguage(event.target.value);
                      setAudioUrl("");
                      setVoiceError("");
                    }}
                    aria-label="Preferred language"
                  >
                    {SUPPORTED_LANGUAGES.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
              </section>

              <section className="classroom-grid">
                <div className="lesson-column">
                  <div className="video-panel">
                    {videoId ? (
                      <iframe
                        className="youtube-frame"
                        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                        title="YouTube learning video"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <div className="empty-video">
                        <div className="large-orbit">✧</div>
                        <h3>Your learning universe starts here</h3>
                        <p>Paste a YouTube lesson below to begin.</p>
                      </div>
                    )}
                  </div>

                  <form
                    className="lesson-input-panel"
                    onSubmit={loadLesson}
                  >
                    <div className="play-icon">▷</div>

                    <div className="lesson-input-content">
                      <label htmlFor="youtube-url">
                        ADD A YOUTUBE LESSON
                      </label>

                      <div className="lesson-input-row">
                        <input
                          id="youtube-url"
                          value={videoUrl}
                          onChange={(event) =>
                            setVideoUrl(event.target.value)
                          }
                          placeholder="Paste your YouTube video URL here..."
                        />

                        <button className="primary-button">
                          Load lesson ↗
                        </button>
                      </div>

                      {videoError && (
                        <p className="inline-error">{videoError}</p>
                      )}
                    </div>
                  </form>

                  <div className="audio-tools">
                    <div>
                      <span className="eyebrow">
                        LEARNING LANGUAGE
                      </span>
                      <strong>{language}</strong>
                    </div>

                    <div className="audio-status">
                      <span className="status-dot" />
                      AI Tutor voice is available for testing
                    </div>
                  </div>
                </div>

                <aside className="tutor-panel">
                  <div className="panel-heading">
                    <span className="eyebrow">
                      YOUR AI COMPANION
                    </span>

                    <span className="ready-status">
                      <i /> READY
                    </span>
                  </div>

                  <div className="tutor-portrait">
                    <img
                      src="ai-tutor.png"
                      alt="AI Classroom tutor"
                    />

                    <div className="tutor-greeting">
                      <strong>Hello! 👋</strong>
                      <p>
                        I'm here to help you learn. What shall we
                        explore today?
                      </p>
                    </div>
                  </div>

                  <div className="tutor-name">
                    {tutorName} ✧
                  </div>

                  <p className="tutor-caption">
                    Your AI Learning Companion
                  </p>

                  {/* AI Tutor voice test */}
                  <div
                    className="tutor-voice-test"
                    style={{ margin: "12px 0" }}
                  >
                    <button
                      type="button"
                      className="small-primary"
                      onClick={() => testTutorVoice(getVoiceTestText(language))}
                      disabled={voiceLoading}
                      style={{
                        width: "100%",
                        padding: "11px",
                        cursor: voiceLoading ? "wait" : "pointer",
                      }}
                    >
                      {voiceLoading
                        ? "Generating voice..."
                        : "🔊 Test Tutor Voice"}
                    </button>

                    {voiceError && (
                      <p
                        className="inline-error"
                        style={{ marginTop: "8px" }}
                      >
                        {voiceError}
                      </p>
                    )}

                    {audioUrl && (
                      <div style={{ marginTop: "10px" }}>
                        <audio
                          controls
                          src={audioUrl}
                          style={{ width: "100%" }}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    )}
                  </div>

                  <div className="tutor-tabs">
                    {["Suggestions", "Notes", "Practice"].map(
                      (tab) => (
                        <button
                          key={tab}
                          className={
                            activeTutorTab === tab ? "active" : ""
                          }
                          onClick={() => setActiveTutorTab(tab)}
                        >
                          {tab === "Suggestions"
                            ? "✧"
                            : tab === "Notes"
                              ? "▤"
                              : "♧"}{" "}
                          {tab}
                        </button>
                      )
                    )}
                  </div>

                  {activeTutorTab === "Suggestions" && (
                    <div className="suggestion-list">
                      {[
                        "Explain this topic in simple words",
                        "Summarize this lesson",
                        "Give me practice questions",
                      ].map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => sendMessage(prompt)}
                        >
                          <span>✧</span>
                          {prompt}
                          <b>›</b>
                        </button>
                      ))}
                    </div>
                  )}

                  {activeTutorTab === "Notes" && (
                    <div className="tutor-content-list">
                      <button onClick={saveNote}>
                        ＋ Save current lesson note
                      </button>

                      {savedNotes.length === 0 ? (
                        <p>No saved notes in this session yet.</p>
                      ) : (
                        savedNotes.map((note, index) => (
                          <p key={index}>▤ {note}</p>
                        ))
                      )}
                    </div>
                  )}

                  {activeTutorTab === "Practice" && (
                    <div className="tutor-content-list">
                      <p>Practice tools for your current lesson.</p>

                      <button
                        onClick={() =>
                          sendMessage(
                            "Create a short quiz for this lesson"
                          )
                        }
                      >
                        Generate a lesson quiz ↗
                      </button>

                      <button
                        onClick={() =>
                          sendMessage(
                            "Ask me five practice questions"
                          )
                        }
                      >
                        Five practice questions ↗
                      </button>
                    </div>
                  )}

                  <div className="chat-messages">
                    {messages.slice(-3).map((message, index) => (
                      <div
                        key={index}
                        className={`chat-message ${
                          message.role === "user"
                            ? "user-message"
                            : ""
                        }`}
                      >
                        {message.text}
                      </div>
                    ))}
                  </div>

                  {chatNotice && (
                    <p className="chat-notice">{chatNotice}</p>
                  )}

                  <form
                    className="chat-input-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendMessage();
                    }}
                  >
                    <input
                      value={chatInput}
                      onChange={(event) =>
                        setChatInput(event.target.value)
                      }
                      placeholder="Ask Your AI Tutor anything..."
                    />

                    <button aria-label="Send message">➤</button>
                  </form>
                </aside>
              </section>
            </>
          )}

          {page !== "Home" && (
            <section className="secondary-page">
              <span className="eyebrow">
                AI CLASSROOM WORKSPACE
              </span>

              <h1>{page}</h1>

              {page === "My Learning" && (
                <div className="content-card">
                  <h3>Your learning journey</h3>
                  <p>
                    Lessons you have opened in this session appear here.
                  </p>

                  {history.length ? (
                    history.map((item, index) => (
                      <div className="history-item" key={index}>
                        ▷ {item}
                      </div>
                    ))
                  ) : (
                    <p>
                      No lessons yet. Go to Home and load a YouTube
                      lesson.
                    </p>
                  )}
                </div>
              )}

              {page === "Library" && (
                <div className="content-card">
                  <h3>Your learning library</h3>
                  <p>
                    Your saved notes and learning resources will be
                    organized here.
                  </p>

                  {savedNotes.length ? (
                    savedNotes.map((item, index) => (
                      <div className="history-item" key={index}>
                        ▤ {item}
                      </div>
                    ))
                  ) : (
                    <p>
                      Your library is waiting for your first saved note.
                    </p>
                  )}
                </div>
              )}

              {page === "Analytics" && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Lessons opened</span>
                    <strong>{history.length}</strong>
                  </div>

                  <div className="stat-card">
                    <span>Saved notes</span>
                    <strong>{savedNotes.length}</strong>
                  </div>

                  <div className="stat-card">
                    <span>Learning language</span>
                    <strong>{language}</strong>
                  </div>
                </div>
              )}

              {page === "Settings" && (
                <div className="content-card settings-card">
                  <h3>Personalize your classroom</h3>

                  <label>
                    AI Tutor name
                    <input
                      value={tutorName}
                      onChange={(event) =>
                        changeTutorName(event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Preferred learning language
                    <select
                      value={language}
                      onChange={(event) => {
                        setLanguage(event.target.value);
                        setAudioUrl("");
                        setVoiceError("");
                      }}
                    >
                      {SUPPORTED_LANGUAGES.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  {user ? (
                    <div className="profile-details">
                      <p>
                        Signed in as <strong>{user.name}</strong>
                      </p>
                      <p>{user.email}</p>

                      <button
                        className="secondary-button"
                        onClick={logout}
                      >
                        Log out
                      </button>
                    </div>
                  ) : (
                    <button
                      className="primary-button"
                      onClick={() => setShowAuth(true)}
                    >
                      Login / Register
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
