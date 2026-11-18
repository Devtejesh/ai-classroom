
import { useState } from "react";
import "./App.css";

const languages = ["English", "Telugu", "Hindi", "Tamil"];

function App() {
  const [assistantName, setAssistantName] = useState(
    localStorage.getItem("assistantName") || "Your AI Tutor"
  );
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [language, setLanguage] = useState("English");
  const [tab, setTab] = useState("Suggestions");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<string[]>([
    "Hello! I'm here to help you understand your lessons. What would you like to learn today?"
  ]);

  function changeAssistantName() {
    const name = window.prompt("What would you like to call your AI tutor?", assistantName);
    if (name?.trim()) {
      setAssistantName(name.trim());
      localStorage.setItem("assistantName", name.trim());
    }
  }

  function loadVideo() {
    try {
      const url = new URL(videoUrl.trim());
      let id = url.searchParams.get("v");

      if (url.hostname.includes("youtu.be")) {
        id = url.pathname.slice(1);
      }

      if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        alert("Please enter a valid YouTube video URL.");
        return;
      }

      setVideoId(id);
    } catch {
      alert("Please enter a valid YouTube URL.");
    }
  }

  function sendMessage(text = question) {
    const value = text.trim();
    if (!value) return;

    setMessages((previous) => [...previous, value]);
    setQuestion("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="orb-logo">✧</div>
        <nav>
          <button className="side-link active"><span>⌂</span>Home</button>
          <button className="side-link"><span>▷</span>My Learning</button>
          <button className="side-link"><span>▤</span>Library</button>
          <button className="side-link"><span>▥</span>Analytics</button>
        </nav>
        <button className="side-link settings"><span>⚙</span>Settings</button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="brand">
            <div className="brand-orb">✧</div>
            <div>
              <h1>AI <span>CLASSROOM</span></h1>
              <p>Learn · Understand · Grow</p>
            </div>
          </div>
          <div className="top-actions">
            <span className="online"><i /> Online</span>
            <button className="icon-button" aria-label="Settings">⚙</button>
            <div className="user-circle">U</div>
          </div>
        </header>

        <section className="dashboard">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR PERSONAL LEARNING SPACE</p>
              <h2>Welcome <span>Back!</span></h2>
              <p className="subheading">
                Your personalized AI learning companion is ready to help you learn better.
              </p>
            </div>
            <label className="language-select">
              <span>◎</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {languages.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="content-grid">
            <section className="learning-column">
              <div className="video-card">
                {videoId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                    title="YouTube lesson"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="video-placeholder">
                    <div className="planet-orb"><span>✧</span></div>
                    <h3>Your learning universe starts here</h3>
                    <p>Paste a YouTube lesson below to begin.</p>
                  </div>
                )}
              </div>

              <div className="video-url-card">
                <div className="url-icon">▷</div>
                <div className="url-content">
                  <label htmlFor="youtube-url">ADD A YOUTUBE LESSON</label>
                  <div className="url-row">
                    <input
                      id="youtube-url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadVideo()}
                      placeholder="Paste your YouTube video URL here..."
                    />
                    <button className="primary-button" onClick={loadVideo}>Load lesson ↗</button>
                  </div>
                </div>
              </div>

              <div className="feature-row">
                <div className="feature-card">
                  <div className="feature-icon cyan">▷</div>
                  <div><h3>Video Learning</h3><p>Watch lessons and learn in your language.</p></div>
                </div>
                <div className="feature-card">
                  <div className="feature-icon violet">✧</div>
                  <div><h3>AI Tutor</h3><p>Personalized explanations and voice interaction.</p></div>
                </div>
              </div>

              <div className="journey-card">
                <div className="journey-icon">▣</div>
                <div>
                  <span>YOUR LEARNING JOURNEY</span>
                  <h3>Start with a lesson or ask your AI tutor</h3>
                  <p>Choose a video, ask questions, or explore topics.</p>
                </div>
                <div className="journey-wave">∿ ∿ ∿</div>
              </div>
            </section>

            <aside className="tutor-card">
              <div className="tutor-topline">
                <span className="eyebrow">YOUR AI COMPANION</span>
                <span className="online"><i /> READY</span>
              </div>

              <div className="tutor-image-wrap">
                <img src="/ai-tutor.png" alt="Realistic futuristic female AI tutor" />
                <div className="greeting-bubble">
                  <strong>Hello! 👋</strong>
                  <p>I'm here to help you learn. What shall we explore today?</p>
                </div>
              </div>

              <div className="tutor-identity">
                <h3>{assistantName}</h3>
                <button onClick={changeAssistantName} title="Change tutor name">✎</button>
                <p>Your AI Learning Companion</p>
              </div>

              <div className="tutor-tabs">
                {["Suggestions", "Notes", "Practice"].map((item) => (
                  <button
                    key={item}
                    className={tab === item ? "selected" : ""}
                    onClick={() => setTab(item)}
                  >
                    {item === "Suggestions" ? "✧" : item === "Notes" ? "▤" : "ϟ"} {item}
                  </button>
                ))}
              </div>

              {tab === "Suggestions" && (
                <div className="suggestions">
                  {[
                    "Explain this topic in simple words",
                    "Summarize this lesson",
                    "Give me practice questions"
                  ].map((item) => (
                    <button key={item} onClick={() => sendMessage(item)}>
                      <span>✧</span>{item}<b>›</b>
                    </button>
                  ))}
                </div>
              )}
              {tab === "Notes" && (
                <div className="tab-placeholder">
                  <span>▤</span><strong>Lesson notes</strong>
                  <p>Your lesson notes will appear here.</p>
                </div>
              )}
              {tab === "Practice" && (
                <div className="tab-placeholder">
                  <span>ϟ</span><strong>Practice zone</strong>
                  <p>Questions based on your lesson will appear here.</p>
                </div>
              )}

              <div className="chat-history">
                {messages.slice(-3).map((item, index) => (
                  <div className="chat-line" key={`${item}-${index}`}>{item}</div>
                ))}
              </div>

              <div className="chat-input">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Ask ${assistantName} anything...`}
                />
                <button onClick={() => sendMessage()} aria-label="Send message">➤</button>
              </div>
              <p className="ai-note">AI responses will be connected to the Python AI engine.</p>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
