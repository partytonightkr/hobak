"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatRelativeTime } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface Comment {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
  parentId: string | null;
  replies: Comment[];
  createdAt: string;
}

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    async function fetchComments() {
      try {
        const { data } = await api.get(`/comments/posts/${postId}/comments`);
        setComments(data.data ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    fetchComments();
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    try {
      const { data: comment } = await api.post(`/comments/posts/${postId}/comments`, {
        content: newComment,
        parentId: replyTo,
      });

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo ? { ...c, replies: [...c.replies, comment] } : c
          )
        );
      } else {
        setComments((prev) => [comment, ...prev]);
      }

      setNewComment("");
      setReplyTo(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-3 flex justify-center py-4">
        <Spinner className="h-5 w-5 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="mt-3 border-t border-surface-100 pt-3 dark:border-surface-800">
      {user && (
        <div className="mb-3 flex gap-2">
          <Avatar src={user.avatarUrl} alt={user.displayName} size="sm" />
          <div className="flex-1">
            {replyTo && (
              <div className="mb-1 flex items-center gap-2 text-xs text-surface-500">
                <span>Replying to a comment</span>
                <button onClick={() => setReplyTo(null)} className="text-primary-500 hover:underline">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 rounded-full border border-surface-200 bg-surface-50 px-3 py-1.5 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
                maxLength={500}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting} disabled={!newComment.trim()}>
                Reply
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={setReplyTo}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  isReply = false,
}: {
  comment: Comment;
  onReply: (id: string) => void;
  isReply?: boolean;
}) {
  return (
    <div className={isReply ? "ml-8" : ""}>
      <div className="flex gap-2">
        <Link href={`/profile/${comment.author.username}`}>
          <Avatar src={comment.author.avatarUrl} alt={comment.author.displayName} size="xs" />
        </Link>
        <div className="flex-1">
          <div className="rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800">
            <div className="flex items-center gap-1.5 text-xs">
              <Link href={`/profile/${comment.author.username}`} className="font-semibold text-surface-900 hover:underline dark:text-surface-100">
                {comment.author.displayName}
              </Link>
              {comment.author.isVerified && (
                <svg className="h-3 w-3 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <p className="mt-0.5 text-sm text-surface-700 dark:text-surface-300">{comment.content}</p>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-surface-500">
            <time>{formatRelativeTime(comment.createdAt)}</time>
            {!isReply && (
              <button onClick={() => onReply(comment.id)} className="hover:text-surface-700">
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies?.map((reply) => (
        <CommentItem key={reply.id} comment={reply} onReply={onReply} isReply />
      ))}
    </div>
  );
}
