"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime, formatCount } from "@/lib/utils";
import { Post } from "@/hooks/useFeed";
import { CommentSection } from "./CommentSection";
import { ReportDialog } from "./ReportDialog";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export function PostCard({ post, onLike }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked);
  const currentUser = useAuthStore((s) => s.user);
  const isOwner = currentUser?.id === post.author.id;

  const handleBookmark = async () => {
    setIsBookmarked(!isBookmarked);
    try {
      await api.post(`/posts/${post.id}/bookmark`);
    } catch {
      setIsBookmarked(isBookmarked);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await api.delete(`/posts/${post.id}`);
    } catch {
      // handle error
    }
  };

  return (
    <article className="border-b border-surface-200 bg-white p-4 transition-colors hover:bg-surface-50/50 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800/50">
      <div className="flex gap-3">
        {post.dog ? (
          <Link href={`/dog/${post.dog.username}`}>
            <Avatar src={post.dog.avatarUrl} alt={post.dog.name} size="md" />
          </Link>
        ) : (
          <Link href={`/profile/${post.author.username}`}>
            <Avatar src={post.author.avatarUrl} alt={post.author.displayName} size="md" />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between">
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {post.dog ? (
                <>
                  <Link href={`/dog/${post.dog.username}`} className="font-semibold text-surface-900 hover:underline dark:text-surface-50">
                    {post.dog.name}
                  </Link>
                  <span className="text-xs text-surface-400">{post.dog.breed}</span>
                </>
              ) : (
                <>
                  <Link href={`/profile/${post.author.username}`} className="font-semibold text-surface-900 hover:underline dark:text-surface-50">
                    {post.author.displayName}
                  </Link>
                  {post.author.isVerified && (
                    <svg className="h-4 w-4 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span className="text-surface-500">@{post.author.username}</span>
                </>
              )}
              <span className="text-surface-400">·</span>
              <time className="text-surface-500">{formatRelativeTime(post.createdAt)}</time>
              {post.isEdited && <span className="text-surface-400 text-xs">(edited)</span>}
              {post.aiAssisted && (
                <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                  </svg>
                  AI-assisted
                </span>
              )}
            </div>

            <Dropdown
              trigger={
                <button className="rounded-lg p-1 text-surface-400 hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                  </svg>
                </button>
              }
            >
              <DropdownItem onClick={handleBookmark}>
                {isBookmarked ? "Remove bookmark" : "Bookmark"}
              </DropdownItem>
              {isOwner && <DropdownItem onClick={handleDelete} danger>Delete post</DropdownItem>}
              {!isOwner && <DropdownItem onClick={() => setShowReport(true)}>Report post</DropdownItem>}
            </Dropdown>
          </div>

          <div className="mt-1">
            <p className="whitespace-pre-wrap text-sm text-surface-800 dark:text-surface-200">{post.content}</p>
          </div>

          {post.mediaUrls.length > 0 && (
            <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {post.mediaUrls.map((url, i) => (
                <div key={i} className="relative aspect-video overflow-hidden rounded-lg bg-surface-100 dark:bg-surface-800">
                  <Image src={url} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {post.visibility === "FOLLOWERS_ONLY" && (
            <Badge variant="default" className="mt-2">Followers only</Badge>
          )}

          <div className="mt-3 flex items-center gap-6">
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-1.5 text-surface-500 transition-colors hover:text-primary-600"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">{formatCount(post.commentsCount)}</span>
            </button>

            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors ${post.isLiked ? "text-red-500" : "text-surface-500 hover:text-red-500"}`}
            >
              <svg className="h-4.5 w-4.5" fill={post.isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs">{formatCount(post.likesCount)}</span>
            </button>

            <button className="flex items-center gap-1.5 text-surface-500 transition-colors hover:text-green-600">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs">{formatCount(post.sharesCount)}</span>
            </button>

            <button
              onClick={handleBookmark}
              className={`ml-auto transition-colors ${isBookmarked ? "text-primary-500" : "text-surface-500 hover:text-primary-500"}`}
            >
              <svg className="h-4.5 w-4.5" fill={isBookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {showComments && <CommentSection postId={post.id} />}
        </div>
      </div>

      <ReportDialog
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        postId={post.id}
      />
    </article>
  );
}
