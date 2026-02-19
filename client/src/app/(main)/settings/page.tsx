"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import api from "@/lib/api";

const profileSchema = z.object({
  displayName: z.string().min(1, "Required").max(50),
  bio: z.string().max(280).optional(),
  website: z.string().url("Invalid URL").or(z.literal("")).optional(),
  location: z.string().max(100).optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? "",
      bio: user?.bio ?? "",
      website: user?.website ?? "",
      location: user?.location ?? "",
    },
  });

  const onSubmit = async (formData: ProfileForm) => {
    setIsSaving(true);
    setSuccessMessage("");
    try {
      const { displayName, bio, website, location } = formData;
      const payload: Record<string, unknown> = { displayName, bio };
      if (website || location) {
        payload.profile = {
          ...(website ? { website } : {}),
          ...(location ? { location } : {}),
        };
      }
      const { data: updatedUser } = await api.patch(`/users/${user?.id}`, payload);
      updateUser(updatedUser);
      setSuccessMessage("Profile updated successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const { data } = await api.patch(`/users/${user?.id}/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser({ avatarUrl: data.avatarUrl });
    } catch {
      // handle error
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="sticky top-[57px] z-10 border-b border-surface-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-surface-700 dark:bg-surface-900/80">
        <h1 className="text-lg font-bold text-surface-900 dark:text-surface-50">Settings</h1>
      </div>

      <div className="space-y-6 p-4">
        <Card>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Profile</h2>

          <div className="mt-4 flex items-center gap-4">
            <Avatar src={user.avatarUrl} alt={user.displayName} size="lg" />
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Change avatar
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {successMessage && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/20 dark:text-green-400">
                {successMessage}
              </div>
            )}

            <Input
              id="displayName"
              label="Display name"
              error={errors.displayName?.message}
              {...register("displayName")}
            />

            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
                Bio
              </label>
              <textarea
                id="bio"
                className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100"
                rows={3}
                maxLength={280}
                {...register("bio")}
              />
            </div>

            <Input
              id="website"
              label="Website"
              placeholder="https://example.com"
              error={errors.website?.message}
              {...register("website")}
            />

            <Input
              id="location"
              label="Location"
              placeholder="San Francisco, CA"
              error={errors.location?.message}
              {...register("location")}
            />

            <Button type="submit" isLoading={isSaving}>Save changes</Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Appearance</h2>
          <div className="mt-4 space-y-3">
            {(["light", "dark", "system"] as const).map((option) => (
              <label key={option} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  checked={theme === option}
                  onChange={() => setTheme(option)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-surface-700 capitalize dark:text-surface-300">{option}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Notifications</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: "Likes on your posts", key: "likes" },
              { label: "Comments on your posts", key: "comments" },
              { label: "New followers", key: "followers" },

              { label: "Mentions", key: "mentions" },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between">
                <span className="text-sm text-surface-700 dark:text-surface-300">{pref.label}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-surface-900 dark:text-surface-50">Privacy</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm text-surface-700 dark:text-surface-300">Private account</span>
                <p className="text-xs text-surface-500">Only approved followers can see your posts</p>
              </div>
              <input
                type="checkbox"
                defaultChecked={false}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-red-600">Danger zone</h2>
          <p className="mt-2 text-sm text-surface-500">Once you delete your account, there is no going back.</p>
          <div className="mt-4 flex gap-3">
            <Button variant="danger" size="sm" onClick={logout}>
              Log out
            </Button>
            <Button variant="danger" size="sm">
              Delete account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
