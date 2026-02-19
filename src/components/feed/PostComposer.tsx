"use client";

import { useState, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { useDogStore } from "@/store/dogStore";
import { Post } from "@/hooks/useFeed";
import api from "@/lib/api";

interface PostComposerProps {
  onPost: (post: Post) => void;
}

export function PostComposer({ onPost }: PostComposerProps) {
  const user = useAuthStore((s) => s.user);
  const { dogs, activeDog, setActiveDog } = useDogStore();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAssisted, setAiAssisted] = useState(false);
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS_ONLY">("PUBLIC");
  const [showDogSelector, setShowDogSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 4) return;

    setImages((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAICaption = async () => {
    if (!activeDog || !content.trim()) return;
    setIsGeneratingAI(true);
    try {
      const { data } = await api.post(`/dogs/${activeDog.id}/ai/generate-post`, {
        topic: content,
      });
      setContent(data.content ?? data.text ?? "");
      setAiAssisted(true);
    } catch {
      // AI generation failed silently — user keeps their original text
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setIsSubmitting(true);

    try {
      // Create the post with JSON body
      const { data: post } = await api.post("/posts", {
        content,
        visibility,
        dogId: activeDog?.id ?? null,
        aiAssisted,
        ...(aiAssisted ? { aiModelUsed: "claude-sonnet-4-6" } : {}),
      });

      // Upload media separately if images were selected
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((img) => formData.append("files", img));
        const { data: mediaData } = await api.post(`/posts/${post.id}/media`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        post.mediaUrls = mediaData.mediaUrls;
      }

      onPost(post);
      setContent("");
      setImages([]);
      setPreviews([]);
      setAiAssisted(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const dogName = activeDog?.name ?? "your dog";

  return (
    <div className="border-b border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
      {/* Dog selector */}
      {activeDog && (
        <div className="relative mb-3 flex items-center gap-2">
          <button
            onClick={() => dogs.length > 1 && setShowDogSelector(!showDogSelector)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <Avatar src={activeDog.avatarUrl} alt={activeDog.name} size="sm" />
            <span className="font-medium text-surface-900 dark:text-surface-100">
              Posting as {activeDog.name}
            </span>
            {dogs.length > 1 && (
              <svg className="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          {showDogSelector && dogs.length > 1 && (
            <div className="absolute left-0 top-full z-20 mt-1 rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-800">
              {dogs.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => {
                    setActiveDog(dog);
                    setShowDogSelector(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-surface-100 dark:hover:bg-surface-700 ${
                    dog.id === activeDog.id ? "bg-primary-50 dark:bg-primary-900/20" : ""
                  }`}
                >
                  <Avatar src={dog.avatarUrl} alt={dog.name} size="sm" />
                  <div className="text-left">
                    <div className="font-medium text-surface-900 dark:text-surface-100">{dog.name}</div>
                    <div className="text-xs text-surface-500">@{dog.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Avatar src={activeDog?.avatarUrl ?? user.avatarUrl} alt={activeDog?.name ?? user.displayName} size="md" />

        <div className="flex-1">
          {aiAssisted && (
            <div className="mb-2 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
              </svg>
              AI-assisted
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (aiAssisted && e.target.value !== content) {
                // Keep aiAssisted flag — user is editing AI text which is fine
              }
            }}
            placeholder={`What's ${dogName} thinking?`}
            className="w-full resize-none border-0 bg-transparent text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none dark:text-surface-100"
            rows={3}
            maxLength={2000}
          />

          {previews.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {previews.map((src, i) => (
                <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-100">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3 dark:border-surface-800">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= 4}
                className="rounded-lg p-2 text-primary-500 hover:bg-primary-50 disabled:opacity-50 dark:hover:bg-primary-900/20"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              <button
                onClick={handleAICaption}
                disabled={!content.trim() || isGeneratingAI || !activeDog}
                title="Generate AI caption"
                className="rounded-lg p-2 text-amber-500 hover:bg-amber-50 disabled:opacity-50 dark:hover:bg-amber-900/20"
              >
                {isGeneratingAI ? (
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L9.19 8.63L2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                  </svg>
                )}
              </button>

              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "FOLLOWERS_ONLY")}
                className="rounded-lg border-0 bg-transparent px-2 py-1 text-xs text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="PUBLIC">Public</option>
                <option value="FOLLOWERS_ONLY">Followers only</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <span className={`text-xs ${content.length > 1900 ? "text-red-500" : "text-surface-400"}`}>
                  {content.length}/2000
                </span>
              )}
              <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting} disabled={!content.trim() && images.length === 0}>
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
