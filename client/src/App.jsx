import { useCallback, useEffect, useState } from "react";
import "./styles.css";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const AUTH_API = `${API_BASE}/api/auth`;
const POSTS_API = `${API_BASE}/api/posts`;

function Avatar({ user, className = "feed-avatar" }) {
  const name = `${user?.firstName || "U"} ${user?.lastName || ""}`.trim();
  return user?.profilePicture ? (
    <img className={className} src={user.profilePicture} alt={`${name} profile`} />
  ) : (
    <div className={`${className} avatar-placeholder`}>{user?.firstName?.[0]?.toUpperCase() || "U"}</div>
  );
}

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function App() {
  const [mode, setMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState(false);
  const [comments, setComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [feed, setFeed] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [myPostCount, setMyPostCount] = useState(0);

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, { ...options, credentials: "include" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Request failed. Please try again.");
    return data;
  }, []);

  const loadPosts = useCallback(async () => {
    const [feedData, mineData] = await Promise.all([
      request(`${POSTS_API}/feed`),
      request(`${POSTS_API}/mine`),
    ]);
    setFeed(feedData.posts || []);
    setMyPosts(mineData.posts || []);
    setMyPostCount(mineData.count || 0);
  }, [request]);

  useEffect(() => {
    request(`${AUTH_API}/me`)
      .then((data) => setUser(data.user))
      .catch(() => {});
  }, [request]);

  useEffect(() => {
    if (!user) return;
    loadPosts().catch((err) => {
      setError(true);
      setNotice(err.message);
    });
  }, [user, loadPosts]);

  async function submit(e) {
    e.preventDefault();
    setNotice("");
    setError(false);
    const values = new FormData(e.currentTarget);

    if (mode === "signup" && values.get("password") !== values.get("confirmPassword")) {
      setError(true);
      setNotice("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      let options;
      if (mode === "signup") {
        values.delete("confirmPassword");
        options = { method: "POST", body: values };
      } else {
        options = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login: values.get("login"), password: values.get("password") }),
        };
      }
      const data = await request(`${AUTH_API}/${mode === "signup" ? "signup" : "login"}`, options);
      setUser(data.user);
      setNotice(mode === "signup" ? "Account created successfully!" : "Login successful!");
    } catch (err) {
      setError(true);
      setNotice(err.message || "Could not connect to the server.");
    } finally {
      setBusy(false);
    }
  }

  async function loadComments(postId) {
  try {
    const data = await request(`${POSTS_API}/${postId}/comments`);

    setComments((prev) => ({
      ...prev,
      [postId]: data.comments,
    }));
  } catch (error) {
    setError(true);
    setNotice(error.message);
  }
}
async function submitComment(postId) {
  const text = commentInputs[postId]?.trim();

  if (!text) return;

  try {
    const data = await request(`${POSTS_API}/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    setComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), data.comment],
    }));

    setCommentInputs((prev) => ({
      ...prev,
      [postId]: "",
    }));
  } catch (error) {
    setError(error.message);
  }
}

  async function logout() {
    try { await request(`${AUTH_API}/logout`, { method: "POST" }); } catch {}
    setUser(null);
    setFeed([]);
    setMyPosts([]);
    setMode("login");
    setNotice("");
  }

  async function uploadImage(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError(true); setNotice("Choose a JPG, PNG, or WebP image."); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(true); setNotice("Image must be 5 MB or smaller."); return;
    }
    if (myPostCount >= 100) {
      setError(true); setNotice("You have reached your 100-image upload limit."); return;
    }

    setUploading(true); setError(false); setNotice("");
    try {
      const body = new FormData();
      body.append("image", file);
      const data = await request(POSTS_API, { method: "POST", body });
      setNotice(data.message || "Image uploaded successfully.");
      await loadPosts();
    } catch (err) {
      setError(true); setNotice(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleLike(postId) {
    try {
      const data = await request(`${POSTS_API}/${postId}/like`, { method: "PATCH" });
      const update = (items) => items.map((post) => post._id === postId
        ? { ...post, likedByMe: data.liked, likes: Array(data.likeCount).fill(null) }
        : post);
      setFeed(update);
      setMyPosts(update);
    } catch (err) {
      setError(true); setNotice(err.message);
    }
  }
  function toggleComments(postId) {
  const isExpanded = expandedComments[postId];

  setExpandedComments((prev) => ({
    ...prev,
    [postId]: !prev[postId],
  }));

  if (!isExpanded && comments[postId] === undefined) {
    loadComments(postId);
  }
}

  if (user) {
    return (
      <main className="app-shell">
        <header className="app-header">
          <a className="brand" href="#home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>InstaClone</a>
          <div className="header-actions">
            <span className="header-user">@{user.username}</span>
            <button className="logout-btn" onClick={logout} type="button">Logout</button>
          </div>
        </header>

        <div className="content-layout">
          <aside className="profile-card">
            <Avatar user={user} className="profile-avatar" />
            <h2>{user.firstName} {user.lastName}</h2>
            <p className="username">@{user.username}</p>
            <div className="profile-count"><strong>{myPostCount}</strong><span> / 100 images uploaded</span></div>
            <label className={`upload-image-btn ${uploading || myPostCount >= 100 ? "disabled" : ""}`}>
              {uploading ? "Uploading..." : myPostCount >= 100 ? "Upload limit reached" : "+ Upload Image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading || myPostCount >= 100} onChange={uploadImage} />
            </label>
            <p className="upload-help">JPG, PNG or WebP · Maximum 5 MB per image</p>
            {notice && <p className={error ? "message error" : "message success"}>{notice}</p>}
            <h3 className="my-posts-heading">My uploaded images</h3>
            <div className="my-posts-grid">
              {myPosts.map((post) => <a href={post.imageUrl} target="_blank" rel="noreferrer" key={post._id}><img src={post.imageUrl} alt="Your uploaded post" /></a>)}
              {myPosts.length === 0 && <p className="empty-posts">You haven't uploaded any images yet.</p>}
            </div>
          </aside>

          <section className="feed-column">
            <div className="feed-heading"><h1>Home Feed</h1><button type="button" onClick={() => loadPosts().catch((err) => { setError(true); setNotice(err.message); })}>Refresh</button></div>
            {feed.length === 0 && <div className="empty-feed">No posts yet. Upload the first image!</div>}
            {feed.map((post) => {
              const liked = post.likedByMe ?? post.likes?.some((id) => String(id) === String(user._id));
              return (
                <article className="feed-post" key={post._id}>
                  <div className="post-author">
                    <Avatar user={post.user || {}} />
                    <div><strong>{post.user?.firstName} {post.user?.lastName}</strong><span>@{post.user?.username}</span></div>
                    <time>{formatDate(post.createdAt)}</time>
                  </div>
                  <img className="feed-image" src={post.imageUrl} alt={`Post by ${post.user?.username || "user"}`} loading="lazy" />
                  <div className="post-actions">
                    <button className={liked ? "like-btn liked" : "like-btn"} type="button" onClick={() => toggleLike(post._id)} aria-label={liked ? "Unlike post" : "Like post"}>
                      {liked ? "♥" : "♡"} <span>{post.likes?.length || 0}</span>
                    </button>
                    <span className="like-caption">{liked ? "You like this" : "Like this post"}</span>
                  </div>
                  <div className="comments-section">
                    <button
                      className="comments-toggle"
                      onClick={() => toggleComments(post._id)}
                    >
                      {expandedComments[post._id] ? "Hide comments" : "View comments"}
                    </button>

                    {expandedComments[post._id] && (
                      <>
                        <div className="comments-list">
                          {(comments[post._id] || []).map((comment) => (
                            <div className="comment-item" key={comment._id}>
                              <strong>@{comment.user?.username}</strong>
                              <span>{comment.text}</span>
                            </div>
                          ))}

                          {comments[post._id]?.length === 0 && (
                            <p className="no-comments">No comments yet. Be the first!</p>
                          )}
                        </div>

                        <form
                          className="comment-form"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitComment(post._id);
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentInputs[post._id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post._id]: e.target.value,
                              }))
                            }
                            maxLength={500}
                          />

                          <button type="submit">Post</button>
                        </form>
                      </>
                    )}
                  </div>

                </article>
              );
            })}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="simple-page">
      <section className="simple-card">
        <h1>Instagram Clone</h1>
        <p className="subtitle">{mode === "signup" ? "Create your account" : "Sign in to your account"}</p>
        <div className="mode-switch">
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setNotice(""); }}>Sign up</button>
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setNotice(""); }}>Login</button>
        </div>
        {notice && <p className={error ? "message error" : "message success"}>{notice}</p>}
        <form onSubmit={submit}>
          {mode === "signup" ? <>
            <label>Profile picture (optional)</label>
            <input type="file" name="profilePicture" accept="image/png,image/jpeg,image/webp" />
            <div className="two-col">
              <div><label>First name</label><input name="firstName" placeholder="First name" required /></div>
              <div><label>Last name</label><input name="lastName" placeholder="Last name" required /></div>
            </div>
            <label>Username</label><input name="username" placeholder="Choose a username" minLength="3" maxLength="24" pattern="[A-Za-z0-9._]+" required />
            <label>Email</label><input type="email" name="email" placeholder="you@example.com" required />
            <label>Date of birth</label><input type="date" name="dateOfBirth" required />
          </> : <><label>Username or email</label><input name="login" placeholder="Username or email" required /></>}
          <label>Password</label><input type="password" name="password" placeholder="Password" minLength={mode === "signup" ? 8 : undefined} required />
          {mode === "signup" && <><label>Confirm password</label><input type="password" name="confirmPassword" placeholder="Confirm password" minLength="8" required /></>}
          <button className="primary-btn" type="submit" disabled={busy}>{busy ? "Please wait..." : mode === "signup" ? "Create account" : "Login"}</button>
        </form>
      </section>
    </main>
  );
}
