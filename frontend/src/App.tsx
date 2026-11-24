import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

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

type ViewMode = "both" | "video" | "chat";

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type SavedNote = {
  id: number;
  user_id?: number;
  session_id: number;
  title: string;
  content: string;
  is_shared: boolean;
  share_token?: string;
  shared_at?: string;
  created_at: string;
  updated_at: string;
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
  const languageCodes: Record<string, string> = {
    English: "en",
    Telugu: "te",
    Hindi: "hi",
  };

  return languageCodes[language] || "en";
}

/* Browser Speech Recognition types */

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function App() {
  const [page, setPage] = useState<Page>("Home");

  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [showAuth, setShowAuth] = useState(
    () => !localStorage.getItem("ai_classroom_token"),
  );
  const [otpStep, setOtpStep] = useState(false);
  const [passwordResetStep, setPasswordResetStep] = useState(false);
const [resetOTP, setResetOTP] = useState("");
const [newPassword, setNewPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [user, setUser] = useState<User | null>(null);

  const [token, setToken] = useState(
    localStorage.getItem("ai_classroom_token") || "",
  );

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  /* Video states */

  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const [transcriptSegments, setTranscriptSegments] = useState<
    TranscriptSegment[]
  >([]);

  const [videoError, setVideoError] = useState("");

  const [language, setLanguage] = useState("English");

  const [viewMode, setViewMode] = useState<ViewMode>("both");

  /* Chat states */

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Hello! I'm your AI tutor. Ask me anything about your lesson.",
    },
  ]);

  const [chatNotice, setChatNotice] = useState("");

  /* Learning states */

  const [history, setHistory] = useState<string[]>([]);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [tutorName, setTutorName] = useState(
    localStorage.getItem("ai_tutor_name") || "Your AI Tutor",
  );

  /* Voice states */

  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* Load user profile */

  useEffect(() => {
    if (!token) return;

    fetch(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Session expired");
        }

        const data = await response.json();

        setUser(data.user || data);
      })
      .catch(() => {
        localStorage.removeItem("ai_classroom_token");
        setToken("");
        setUser(null);
        setShowAuth(true);
      });
  }, [token]);

  /* Automatically scroll chat */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, chatLoading]);

  /* Load saved notes whenever the Library page is opened */
  useEffect(() => {
    if (page !== "Library" || !token) return;

    fetchSavedNotes().catch((error) => {
      setNotesError(
        error instanceof Error ? error.message : "Unable to load saved notes.",
      );
    });
  }, [page, token]);

  /* Cleanup audio and microphone */

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  /* Authentication */

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "Authentication failed. Please try again.",
        );
      }

      if (authMode === "register") {
        setOtp("");
        setOtpStep(true);

        setAuthMessage(data.message || "Verification OTP sent to your email.");

        setPassword("");

        return;
      }

      if (!data.token) {
        throw new Error("Login response did not contain a JWT token.");
      }

      localStorage.setItem("ai_classroom_token", data.token);

      setToken(data.token);

      setUser(
        data.user || {
          name: email.split("@")[0],
          email,
        },
      );

      setShowAuth(false);
      setPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setAuthLoading(false);
    }
  }


  /* Forgot Password */

  async function handleForgotPassword() {
    setAuthError("");
    setAuthMessage("");

    if (!email.trim()) {
      setAuthError("Please enter your registered email address.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to send reset OTP.");
      }

      setResetOTP("");
      setNewPassword("");
      setPasswordResetStep(true);
      setAuthMessage(
        data.message || "If your account is eligible, a password reset OTP has been sent."
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to send OTP."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  /* Reset Password */

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthError("");
    setAuthMessage("");

    if (!/^\d{6}$/.test(resetOTP)) {
      setAuthError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (newPassword.length < 8) {
      setAuthError("New password must contain at least 8 characters.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: resetOTP,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Password reset failed.");
      }

      setPasswordResetStep(false);
      setResetOTP("");
      setNewPassword("");
      setPassword("");
      setAuthMode("login");

      setAuthMessage(data.message || "Password reset successful. Please log in.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Password reset failed."
      );
    } finally {
      setAuthLoading(false);
    }
  }

  /* Resend OTP */

  async function resendOTP() {
    setAuthError("");
    setAuthMessage("");

    if (!email.trim()) {
      setAuthError("Please enter your registered email address first.");
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Unable to send OTP.");
      }

      setOtp("");
      setOtpStep(true);

      setAuthMessage(data.message || "A new verification OTP has been sent.");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Unable to send OTP.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  /* Verify OTP */

  async function verifyOTP(event: FormEvent<HTMLFormElement>) {
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          otp,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "OTP verification failed.",
        );
      }

      setOtpStep(false);
      setOtp("");
      setAuthMode("login");
      setPassword("");

      setAuthMessage(
        data.message || "Email verified successfully. You can now log in.",
      );
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "OTP verification failed.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  /* Logout */

  function logout() {
    localStorage.removeItem("ai_classroom_token");

    setToken("");
    setUser(null);
    setSavedNotes([]);
    setShowAuth(true);
    setAuthMode("register");
    setPage("Home");
  }

  /* Load YouTube lesson */

  async function loadLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setVideoError("");

    const id = getYouTubeId(videoUrl.trim());

    if (!id) {
      setVideoError("Please enter a valid YouTube video URL.");
      return;
    }

    setVideoId(id);
    setCurrentSessionId(null);
    setTranscriptSegments([]);

    setChatNotice("Preparing lesson transcript...");

    try {
      const response = await fetch(`${AI_ENGINE_URL}/youtube/transcript`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: videoUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to process this YouTube lesson.",
        );
      }

      if (!data.success || !Array.isArray(data.segments)) {
        throw new Error("Transcript was not returned by AI Engine.");
      }

      // Create a new learning session in PostgreSQL.
      const sessionResponse = await fetch(`${API_URL}/learning/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          video_id: id,
          video_title: data.title || `YouTube lesson (${id})`,
        }),
      });

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(
          sessionData.error || "Failed to create learning session.",
        );
      }

      setCurrentSessionId(sessionData.session.id);
      setTranscriptSegments(data.segments);

      setHistory((previous) => [
        `YouTube lesson – ${new Date().toLocaleDateString()}`,
        ...previous,
      ]);

      setChatNotice(
        `Lesson transcript ready in ${language}. Ask your tutor a question.`,
      );
    } catch (error) {
      setVideoError(
        error instanceof Error
          ? error.message
          : "Unable to load lesson transcript.",
      );

      setChatNotice("");
    }
  }

  /* Gemini text-to-speech */

  async function testTutorVoice(text: string) {
    setVoiceError("");

    if (voiceLoading || !text.trim()) {
      return;
    }

    setVoiceLoading(true);

    try {
      const response = await fetch(`${AI_ENGINE_URL}/tutor/speak`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: text.trim(),
          voice: "Kore",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `Speech API failed (${response.status}): ${errorText.slice(0, 300)}`,
        );
      }

      const blob = await response.blob();

      if (blob.size <= 44) {
        throw new Error("AI Engine returned an empty audio file.");
      }

      const newAudioUrl = URL.createObjectURL(blob);

      setAudioUrl((oldUrl) => {
        if (oldUrl) {
          URL.revokeObjectURL(oldUrl);
        }

        return newAudioUrl;
      });

      const audio = new Audio(newAudioUrl);

      await audio.play();
    } catch (error) {
      setVoiceError(
        error instanceof Error ? error.message : "Unable to play tutor voice.",
      );
    } finally {
      setVoiceLoading(false);
    }
  }

  /* Send question to AI Tutor */

  async function sendMessage(text = chatInput) {
    const value = text.trim();

    if (!value || chatLoading) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: value,
      },
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

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: answer,
        },
      ]);

      setChatNotice("");

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

  async function generateLessonNotes() {
    if (!currentSessionId || !transcriptSegments.length) {
      setNotesError("Load a lesson before generating notes.");
      return;
    }

    setNotesLoading(true);
    setNotesError("");

    try {
      const response = await fetch(`${AI_ENGINE_URL}/tutor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question:
            "Create comprehensive, well-structured study notes for this entire video. Include a suitable title, key concepts, detailed explanations, important points, and practical examples. Use clear Markdown formatting. Do not answer as a conversation; prepare notes for a student to revise later.",
          segments: transcriptSegments,
          target_language: getLanguageCode(language),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to generate lesson notes.");
      }

      if (!data.answer?.trim()) {
        throw new Error("AI Tutor returned empty notes.");
      }

      setNoteTitle(`Lesson Notes - ${videoId}`);
      setNoteContent(data.answer.trim());
    } catch (error) {
      setNotesError(
        error instanceof Error
          ? error.message
          : "Failed to generate lesson notes.",
      );
    } finally {
      setNotesLoading(false);
    }
  }

  /* Voice input */

  function startVoiceInput() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceError(
        "Speech recognition is not supported in this browser. Please use Chrome or Edge.",
      );
      return;
    }

    setVoiceError("");

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new Recognition();

    const languageCode = getLanguageCode(language);

    recognition.lang =
      languageCode === "te"
        ? "te-IN"
        : languageCode === "hi"
          ? "hi-IN"
          : "en-IN";

    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      setChatInput(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);

      setVoiceError(
        "Microphone input failed. Check browser microphone permission.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);

      setVoiceError("Could not start microphone input. Please try again.");
    }
  }

  /* Fetch saved notes from PostgreSQL */
  async function fetchSavedNotes() {
    if (!token) {
      setSavedNotes([]);
      return;
    }

    const response = await fetch(`${API_URL}/learning/notes`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || data.message || "Unable to load saved notes.",
      );
    }

    const notes = Array.isArray(data)
      ? data
      : Array.isArray(data.notes)
        ? data.notes
        : Array.isArray(data.data)
          ? data.data
          : [];

    setSavedNotes(notes);
  }

  /* Save lesson note */
  async function saveNote() {
    if (!token) {
      setNotesError("Please login to save notes.");
      return;
    }

    if (!currentSessionId) {
      setNotesError("Load a lesson before saving notes.");
      return;
    }

    if (!noteTitle.trim() || !noteContent.trim()) {
      setNotesError("Please enter a note title and content.");
      return;
    }

    setNotesError("");

    try {
      const response = await fetch(`${API_URL}/learning/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          title: noteTitle.trim(),
          content: noteContent.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to save notes.");
      }

      // Reload the actual saved note records from the backend.
      await fetchSavedNotes();

      setNotesError("");
      setChatNotice("Notes saved successfully!");
    } catch (error) {
      setNotesError(
        error instanceof Error ? error.message : "Unable to save notes.",
      );
    }
  }
  /* Download notes as Unicode-friendly TXT or printable PDF */
  function downloadNoteAsText(title: string, content: string) {
    const blob = new Blob(["\uFEFF", content], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.trim() || "lesson-notes"}.txt`.replace(/[\\/:*?"<>|]/g, "-");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadNoteAsPDF(title: string, content: string) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotesError("Please allow pop-ups to save notes as PDF.");
      return;
    }

    const escapeHTML = (value: string) =>
      value.replace(/[&<>"']/g, (character) => {
        const entities: Record<string, string> = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[character];
      });

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHTML(title || "Lesson Notes")}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body {
              font-family: "Noto Sans Telugu", "Noto Sans Devanagari",
                "Nirmala UI", "Lohit Telugu", Arial, sans-serif;
              color: #171717;
              line-height: 1.65;
              font-size: 12pt;
            }
            h1 { font-size: 20pt; margin: 0 0 18px; }
            .content { white-space: pre-wrap; overflow-wrap: anywhere; }
          </style>
        </head>
        <body>
          <h1>${escapeHTML(title || "Lesson Notes")}</h1>
          <div class="content">${escapeHTML(content)}</div>
          <script>window.onload = () => { window.focus(); window.print(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  }

  /* Update tutor name */

  function changeTutorName(value: string) {
    setTutorName(value);

    localStorage.setItem("ai_tutor_name", value);
  }

  /* Navigation */

  const navItems: {
    label: Page;
    icon: string;
  }[] = [
    { label: "Home", icon: "⌂" },
    { label: "My Learning", icon: "▷" },
    { label: "Library", icon: "▤" },
    { label: "Analytics", icon: "▥" },
  ];

  /* Authentication screen */

  if (showAuth) {
    return (
      <div className="auth-screen">
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
          <div className="brand-title">AI CLASSROOM</div>

          <p className="brand-subtitle">Learn · Understand · Grow</p>

          {otpStep ? (
            <>
              <div className="auth-heading">
                <span className="eyebrow">EMAIL VERIFICATION</span>

                <h1>Verify Your Email</h1>

                <p>Enter the 6-digit verification code sent to {email}.</p>
              </div>

              <form className="auth-form" onSubmit={verifyOTP}>
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
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
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
                Didn't receive the code? Resend OTP
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
          ) : passwordResetStep ? (
            <>
              <div className="auth-heading">
                <span className="eyebrow">ACCOUNT RECOVERY</span>
                <h1>Reset Password</h1>
                <p>Enter the OTP sent to {email} and choose a new password.</p>
              </div>

              <form className="auth-form" onSubmit={handleResetPassword}>
                <label>
                  6-digit OTP
                  <input
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={resetOTP}
                    onChange={(event) =>
                      setResetOTP(event.target.value.replace(/\\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    required
                  />
                </label>

                <label>
                  New password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Enter new password"
                    minLength={8}
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
                  {authLoading ? "Resetting..." : "Reset Password →"}
                </button>
              </form>

              <button
                className="otp-back-button"
                type="button"
                onClick={() => {
                  setPasswordResetStep(false);
                  setResetOTP("");
                  setNewPassword("");
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
                <span className="eyebrow">YOUR PERSONAL LEARNING SPACE</span>

                <h1>
                  {authMode === "login" ? "Welcome Back!" : "Create Account"}
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
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                {authMode === "login" && (
                  <div className="forgot-password">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

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

  /* Main application */

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">✧</div>

        <nav className="side-navigation">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${page === item.label ? "selected" : ""}`}
              onClick={() => setPage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "Settings" ? "selected" : ""}`}
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

              <div className="brand-subtitle">Learn · Understand · Grow</div>
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
                title={`${user.name} — log out`}
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
              <section className="classroom-toolbar">
                <label className="language-select">
                  <span>Language</span>

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

                <div className="view-mode-switch" aria-label="Classroom layout">
                  <button
                    className={viewMode === "both" ? "active" : ""}
                    onClick={() => setViewMode("both")}
                  >
                    Video + Chat
                  </button>

                  <button
                    className={viewMode === "video" ? "active" : ""}
                    onClick={() => setViewMode("video")}
                  >
                    Video Only
                  </button>

                  <button
                    className={viewMode === "chat" ? "active" : ""}
                    onClick={() => setViewMode("chat")}
                  >
                    Chat Only
                  </button>
                </div>
              </section>

              <section className={`classroom-layout mode-${viewMode}`}>
                {viewMode !== "chat" && (
                  <section className="lesson-column">
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
                          <span className="empty-video-icon">▶</span>

                          <p>
                            Paste a YouTube lesson link below to start learning.
                          </p>
                        </div>
                      )}
                    </div>

                    <form className="lesson-input-panel" onSubmit={loadLesson}>
                      <label className="lesson-input-content">
                        <span>YOUTUBE LESSON URL</span>

                        <div className="lesson-input-row">
                          <input
                            value={videoUrl}
                            onChange={(event) =>
                              setVideoUrl(event.target.value)
                            }
                            placeholder="Paste your YouTube video URL here..."
                            aria-label="YouTube video URL"
                          />

                          <button className="primary-button">
                            Load lesson
                          </button>
                        </div>

                        {videoError && (
                          <p className="inline-error">{videoError}</p>
                        )}
                      </label>
                    </form>
                  </section>
                )}

                {viewMode !== "video" && (
                  <section className="chat-panel" aria-label="AI Tutor chat">
                    <header className="chat-header">
                      <div>
                        <h2>{tutorName}</h2>

                        <span className="chat-online">
                          <i /> Ready to help
                        </span>
                      </div>

                      <button
                        className="clear-chat-button"
                        onClick={() => {
                          setMessages([
                            {
                              role: "assistant",
                              text: "Hello! I'm your AI tutor. Ask me anything about your lesson.",
                            },
                          ]);

                          setChatNotice("");
                        }}
                      >
                        New chat
                      </button>
                    </header>

                    <div className="chat-messages" aria-live="polite">
                      {" "}
                      {messages.map((message, index) => (
                        <article
                          key={`${index}-${message.role}`}
                          className={`chat-message ${
                            message.role === "user"
                              ? "user-message"
                              : "assistant-message"
                          }`}
                        >
                          <span className="message-role">
                            {message.role === "user" ? "You" : "AI Tutor"}
                          </span>

                          <div className="message-text">
                            {message.role === "user" ? (
                              <div>{message.text}</div>
                            ) : (
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                              >
                                {message.text}
                              </ReactMarkdown>
                            )}
                          </div>
                        </article>
                      ))}
                      {chatLoading && (
                        <article className="chat-message assistant-message">
                          <span className="message-role">AI Tutor</span>

                          <div className="typing-indicator">
                            <i />
                            <i />
                            <i />
                          </div>
                        </article>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {(chatNotice || voiceError) && (
                      <div
                        className={`chat-status ${
                          voiceError ? "error-text" : ""
                        }`}
                      >
                        {voiceError || chatNotice}
                      </div>
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
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Ask your question..."
                        aria-label="Message your AI tutor"
                      />

                      <button
                        type="button"
                        className={`mic-button ${
                          isListening ? "listening" : ""
                        }`}
                        onClick={startVoiceInput}
                        title={
                          isListening
                            ? "Stop voice input"
                            : "Speak your question"
                        }
                        aria-label={
                          isListening ? "Stop voice input" : "Start voice input"
                        }
                      >
                        🎙
                      </button>

                      <button
                        className="send-button"
                        aria-label="Send message"
                        disabled={!chatInput.trim() || chatLoading}
                      >
                        ➤
                      </button>
                    </form>

                    <div className="chat-footer">
                      <span>
                        {isListening
                          ? "Listening… speak now"
                          : `Responses in ${language}`}
                      </span>

                      <span>{voiceLoading ? "Preparing voice…" : ""}</span>
                    </div>

                    {audioUrl && (
                      <audio className="chat-audio" controls src={audioUrl}>
                        Your browser does not support audio playback.
                      </audio>
                    )}
                  </section>
                )}
              </section>
            </>
          )}

          {page !== "Home" && (
            <section className="secondary-page">
              <span className="eyebrow">AI CLASSROOM</span>

              <h1>{page}</h1>

              {page === "My Learning" && (
                <div className="content-card">
                  <h3>Your learning history</h3>

                  {history.length ? (
                    history.map((item, index) => (
                      <div className="history-item" key={index}>
                        {item}
                      </div>
                    ))
                  ) : (
                    <p>No lessons yet. Go to Home and load a YouTube lesson.</p>
                  )}
                </div>
              )}
              {page === "Library" && (
                <div className="content-card notes-workspace">
                  <h3>Lesson Notes</h3>

                  <div className="notes-editor">
                    <input
                      type="text"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Enter note title"
                    />

                    <button
                      className="secondary-button"
                      onClick={generateLessonNotes}
                      disabled={notesLoading}
                    >
                      {notesLoading
                        ? "Generating Notes..."
                        : "✨ Generate AI Notes"}
                    </button>

                    {notesError && (
                      <p className="error-message">{notesError}</p>
                    )}

                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Write your notes here or generate them using AI..."
                      rows={18}
                    />

                    <section className="notes-preview-section">
                      <div className="notes-preview-heading">
                        <h3>Notes Preview</h3>
                        <span>Formatted reading view</span>
                      </div>

                      <div className="notes-preview">
                        {noteContent.trim() ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {noteContent}
                          </ReactMarkdown>
                        ) : (
                          <p className="notes-preview-placeholder">
                            Your formatted notes will appear here as you type or generate them.
                          </p>
                        )}
                      </div>
                    </section>

                    <button className="primary-button" onClick={saveNote}>
                      Save Notes
                    </button>
                    <div className="notes-download-actions">
                      <button
                        className="secondary-button"
                        onClick={() => downloadNoteAsText(noteTitle, noteContent)}
                        disabled={!noteTitle.trim() || !noteContent.trim()}
                      >
                        Download TXT
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => downloadNoteAsPDF(noteTitle, noteContent)}
                        disabled={!noteTitle.trim() || !noteContent.trim()}
                      >
                        Save as PDF
                      </button>
                    </div>
                  </div>

                  <hr />

                  <h3>Saved Notes</h3>
                  {savedNotes.length ? (
                    savedNotes.map((item) => (
                      <div className="saved-note-item" key={item.id}>
                        <h4>{item.title}</h4>
                        <div className="saved-note-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                          >
                            {item.content}
                          </ReactMarkdown>
                        </div>
                        <div className="notes-download-actions">
                          <button
                            className="secondary-button"
                            onClick={() => downloadNoteAsText(item.title, item.content)}
                          >
                            Download TXT
                          </button>
                          <button
                            className="secondary-button"
                            onClick={() => downloadNoteAsPDF(item.title, item.content)}
                          >
                            Save as PDF
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No saved notes yet.</p>
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

                  <div className="stat-card">
                    <span>Chat messages</span>
                    <strong>{messages.length}</strong>
                  </div>
                </div>
              )}

              {page === "Settings" && (
                <div className="content-card settings-card">
                  <h3>Settings</h3>

                  <label>
                    AI Tutor name
                    <input
                      value={tutorName}
                      onChange={(event) => changeTutorName(event.target.value)}
                    />
                  </label>

                  <label>
                    Preferred learning language
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
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

                      <button className="secondary-button" onClick={logout}>
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
