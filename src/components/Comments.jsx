import { useEffect, useState } from "react";
import { getComments, addComment, toggleUpvote } from "../utils/firebase";
import { useAuth } from "../context/AuthContext";
import "./Comments.css";

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function CommentItem({ comment, replies, user, profile, onUpvote, onReply }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasVoted = comment.upvotedBy?.includes(user?.uid);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onReply(replyText.trim(), comment.id);
    setReplyText("");
    setShowReply(false);
    setSubmitting(false);
  };

  return (
    <div className="tx-comment">
      <div className="tx-comment__vote">
        <button
          className={`tx-comment__upvote${hasVoted ? " tx-comment__upvote--on" : ""}`}
          onClick={() => onUpvote(comment, hasVoted)}
        >
          ▲
        </button>
        <span className="tx-comment__score">{comment.upvotes || 0}</span>
      </div>
      <div className="tx-comment__body">
        <p className="tx-comment__meta">
          <span className="tx-comment__author">{comment.authorName}</span>
          <span className="tx-comment__time">{timeAgo(comment.createdAt)}</span>
        </p>
        <p className="tx-comment__text">{comment.text}</p>
        <button className="tx-comment__reply-btn" onClick={() => setShowReply((s) => !s)}>
          Reply
        </button>

        {showReply && (
          <form onSubmit={handleReply} className="tx-comment__reply-form">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Replying to ${comment.authorName}…`}
              rows={2}
              className="tx-comments__textarea tx-comments__textarea--sm"
              autoFocus
            />
            <div className="tx-comment__reply-actions">
              <button type="submit" className="tx-btn tx-btn--ember tx-btn--sm" disabled={!replyText.trim() || submitting}>
                {submitting ? "Posting…" : "Reply"}
              </button>
              <button type="button" className="tx-btn tx-btn--ghost tx-btn--sm" onClick={() => { setShowReply(false); setReplyText(""); }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {replies.length > 0 && (
          <div className="tx-comment__replies">
            {replies.map((reply) => {
              const replyVoted = reply.upvotedBy?.includes(user?.uid);
              return (
                <div key={reply.id} className="tx-comment tx-comment--reply">
                  <div className="tx-comment__vote">
                    <button
                      className={`tx-comment__upvote${replyVoted ? " tx-comment__upvote--on" : ""}`}
                      onClick={() => onUpvote(reply, replyVoted)}
                    >
                      ▲
                    </button>
                    <span className="tx-comment__score">{reply.upvotes || 0}</span>
                  </div>
                  <div className="tx-comment__body">
                    <p className="tx-comment__meta">
                      <span className="tx-comment__author">{reply.authorName}</span>
                      <span className="tx-comment__time">{timeAgo(reply.createdAt)}</span>
                    </p>
                    <p className="tx-comment__text">{reply.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Comments({ uploadId }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => getComments(uploadId).then(setComments);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  const topLevel = [...comments.filter((c) => !c.parentId)].sort(
    (a, b) => (b.upvotes || 0) - (a.upvotes || 0)
  );
  const repliesFor = (id) => comments.filter((c) => c.parentId === id);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    await addComment(uploadId, user.uid, profile.name, text.trim());
    await refresh();
    setText("");
    setSubmitting(false);
  };

  const handleUpvote = async (comment, hasVoted) => {
    await toggleUpvote(comment.id, user.uid, hasVoted);
    await refresh();
  };

  const handleReply = async (replyText, parentId) => {
    await addComment(uploadId, user.uid, profile.name, replyText, parentId);
    await refresh();
  };

  return (
    <div className="tx-comments">
      <h3 className="tx-comments__heading">
        {comments.length} {comments.length === 1 ? "comment" : "comments"}
      </h3>

      <form onSubmit={handlePost} className="tx-comments__compose">
        <div className="tx-comments__avatar">{profile?.name?.[0]?.toUpperCase() || "?"}</div>
        <div className="tx-comments__compose-right">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts…"
            rows={2}
            className="tx-comments__textarea"
          />
          <button type="submit" className="tx-btn tx-btn--ember tx-btn--sm" disabled={!text.trim() || submitting}>
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      <div className="tx-comments__list">
        {topLevel.map((c) => (
          <CommentItem
            key={c.id}
            comment={c}
            replies={repliesFor(c.id)}
            user={user}
            profile={profile}
            onUpvote={handleUpvote}
            onReply={handleReply}
          />
        ))}
        {comments.length === 0 && (
          <p className="tx-comments__empty">No comments yet. Be the first.</p>
        )}
      </div>
    </div>
  );
}
