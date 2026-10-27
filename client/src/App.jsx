
import { useEffect, useState } from "react";
import "./styles.css";

const API = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth`;

export default function App() {
  const [mode, setMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    fetch(`${API}/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setNotice("");
    setError(false);

    const form = e.currentTarget;
    const values = new FormData(form);

    if (
      mode === "signup" &&
      values.get("password") !== values.get("confirmPassword")
    ) {
      setError(true);
      setNotice("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      let options;

      if (mode === "signup") {
        values.delete("confirmPassword");
        options = {
          method: "POST",
          body: values,
          credentials: "include",
        };
      } else {
        options = {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login: values.get("login"),
            password: values.get("password"),
          }),
        };
      }

      const response = await fetch(
        `${API}/${mode === "signup" ? "signup" : "login"}`,
        options
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Something went wrong.");

      setUser(data.user);
      setNotice(mode === "signup" ? "Account created successfully!" : "Login successful!");
    } catch (err) {
      setError(true);
      setNotice(err.message || "Could not connect to the server.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${API}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}

    setUser(null);
    setMode("login");
    setNotice("");
  }


if (user) {
  return (
    <main className="profile-page">
      <header className="profile-header">
        <h1>InstaClone</h1>
        <button
          className="logout-btn"
          onClick={logout}
          type="button"
        >
          Logout
        </button>
      </header>

      <section className="profile-info">
        <div className="profile-top">
          {user.profilePicture ? (
            <img
              className="profile-avatar"
              src={user.profilePicture}
              alt="Profile"
            />
          ) : (
            <div className="profile-avatar avatar-placeholder">
              {user.firstName?.charAt(0)?.toUpperCase()}
            </div>
          )}

          <div className="profile-details">
            <h2>{user.firstName} {user.lastName}</h2>
            <p className="username">@{user.username}</p>

            {/* <div className="profile-stats">
              <div><strong>0</strong><span>Posts</span></div>
              <div><strong>0</strong><span>Followers</span></div>
              <div><strong>0</strong><span>Following</span></div>
            </div> */}
          </div>
        </div>

        <p className="profile-bio">Welcome to my profile!</p>
      </section>

      
    <section className="posts-section">
      <h3>My Posts</h3>

      <div className="posts-grid">
        {posts.map((post, index) => (
          <div className="post-item" key={post.id}>
            <img src={post.url} alt={`Post ${index + 1}`} />

            <button
              type="button"
              className="delete-post-btn"
              onClick={() => {
                URL.revokeObjectURL(post.url);
                setPosts((current) =>
                  current.filter((item) => item.id !== post.id)
                );
              }}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="empty-posts">No images uploaded yet.</p>
        )}
      </div>
    </section>
    <label className="upload-image-btn">
      + Upload Image

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          const validFiles = files.filter(
            (file) =>
              file.type.startsWith("image/") &&
              file.size <= 5 * 1024 * 1024
          );

          if (files.length !== validFiles.length) {
            setNotice("Some files were skipped. Select images up to 5 MB each.");
          } else {
            setNotice("");
          }

          const newPosts = validFiles.map((file) => ({
            id: crypto.randomUUID(),
            url: URL.createObjectURL(file),
          }));

          setPosts((current) => [...newPosts, ...current]);
          e.target.value = "";
        }}
      />
    </label>
      {notice && <p className="profile-notice">{notice}</p>}
    </main>
  );
}


  return (
    <main className="simple-page">
      <section className="simple-card">
        <h1>Instagram Clone</h1>
        <p className="subtitle">
          {mode === "signup" ? "Create your account" : "Sign in to your account"}
        </p>

        <div className="mode-switch">
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setNotice("");
            }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setNotice("");
            }}
          >
            Login
          </button>
        </div>

        {notice && (
          <p className={error ? "message error" : "message success"}>
            {notice}
          </p>
        )}

        <form onSubmit={submit}>
          {mode === "signup" ? (
            <>
              <label>Profile picture (optional)</label>
              <input
                type="file"
                name="profilePicture"
                accept="image/png,image/jpeg,image/webp"
              />

              <div className="two-col">
                <div>
                  <label>First name</label>
                  <input name="firstName" placeholder="First name" required />
                </div>
                <div>
                  <label>Last name</label>
                  <input name="lastName" placeholder="Last name" required />
                </div>
              </div>

              <label>Username</label>
              <input
                name="username"
                placeholder="Choose a username"
                minLength="3"
                maxLength="24"
                pattern="[A-Za-z0-9._]+"
                required
              />

              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                required
              />

              <label>Date of birth</label>
              <input type="date" name="dateOfBirth" required />
            </>
          ) : (
            <>
              <label>Username or email</label>
              <input
                name="login"
                placeholder="Username or email"
                required
              />
            </>
          )}

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Password"
            minLength={mode === "signup" ? 8 : undefined}
            required
          />

          {mode === "signup" && (
            <>
              <label>Confirm password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                minLength="8"
                required
              />
            </>
          )}

          <button className="primary-btn" type="submit" disabled={busy}>
            {busy ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
