"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useDogStore, Dog } from "@/store/dogStore";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const dogSchema = z.object({
  name: z
    .string()
    .min(1, "Dog name is required")
    .max(100, "Max 100 characters"),
  username: z
    .string()
    .min(3, "At least 3 characters")
    .max(30, "Max 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  breed: z.string().min(1, "Breed is required"),
  dateOfBirth: z.string().optional(),
  size: z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]),
  personalityTraits: z
    .array(z.string())
    .min(3, "Pick at least 3 traits")
    .max(5, "Pick at most 5 traits"),
  temperamentNotes: z.string().max(500).optional(),
});

type DogForm = z.infer<typeof dogSchema>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = ["Basics", "Personality", "Photo", "Review"] as const;

const SIZE_OPTIONS: { value: Dog["size"]; label: string; description: string }[] = [
  { value: "SMALL", label: "Small", description: "Under 25 lbs" },
  { value: "MEDIUM", label: "Medium", description: "25-50 lbs" },
  { value: "LARGE", label: "Large", description: "50-100 lbs" },
  { value: "EXTRA_LARGE", label: "Extra Large", description: "Over 100 lbs" },
];

const PERSONALITY_TRAITS = [
  "Playful",
  "Calm",
  "Energetic",
  "Shy",
  "Friendly",
  "Stubborn",
  "Curious",
  "Protective",
  "Goofy",
  "Independent",
] as const;

const COMMON_BREEDS = [
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "French Bulldog",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Rottweiler",
  "Dachshund",
  "Corgi",
  "Siberian Husky",
  "Australian Shepherd",
  "Shih Tzu",
  "Border Collie",
  "Pomeranian",
  "Chihuahua",
  "Mixed Breed",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [breedSuggestions, setBreedSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<DogForm>({
    resolver: zodResolver(dogSchema),
    defaultValues: {
      name: "",
      username: "",
      breed: "",
      dateOfBirth: "",
      size: "MEDIUM",
      personalityTraits: [],
      temperamentNotes: "",
    },
  });

  const watchedValues = watch();

  // -- Breed suggestions ---------------------------------------------------
  const handleBreedInput = (value: string) => {
    setValue("breed", value);
    if (value.length > 0) {
      const filtered = COMMON_BREEDS.filter((b) =>
        b.toLowerCase().includes(value.toLowerCase())
      );
      setBreedSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectBreed = (breed: string) => {
    setValue("breed", breed);
    setShowSuggestions(false);
  };

  // -- Personality traits --------------------------------------------------
  const toggleTrait = (trait: string) => {
    const current = watchedValues.personalityTraits;
    if (current.includes(trait)) {
      setValue(
        "personalityTraits",
        current.filter((t) => t !== trait),
        { shouldValidate: true }
      );
    } else if (current.length < 5) {
      setValue("personalityTraits", [...current, trait], {
        shouldValidate: true,
      });
    }
  };

  // -- Avatar handling -----------------------------------------------------
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // -- Step navigation -----------------------------------------------------
  const nextStep = async () => {
    let valid = true;
    if (step === 0) {
      valid = await trigger(["name", "username", "breed"]);
    } else if (step === 1) {
      valid = await trigger(["size", "personalityTraits"]);
    }
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  // -- Submit --------------------------------------------------------------
  const onSubmit = async (data: DogForm) => {
    setIsSubmitting(true);
    setError("");
    try {
      // Build form data if avatar is present, otherwise plain JSON
      let responseData: Dog;

      if (avatarFile) {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("username", data.username);
        formData.append("breed", data.breed);
        if (data.dateOfBirth) formData.append("dateOfBirth", data.dateOfBirth);
        formData.append("size", data.size);
        data.personalityTraits.forEach((t) =>
          formData.append("personalityTraits", t)
        );
        if (data.temperamentNotes)
          formData.append("temperamentNotes", data.temperamentNotes);
        formData.append("avatar", avatarFile);

        const res = await api.post("/dogs", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        responseData = res.data.data ?? res.data.dog ?? res.data;
      } else {
        const res = await api.post("/dogs", {
          name: data.name,
          username: data.username,
          breed: data.breed,
          dateOfBirth: data.dateOfBirth || null,
          size: data.size,
          personalityTraits: data.personalityTraits,
          temperamentNotes: data.temperamentNotes || null,
        });
        responseData = res.data.data ?? res.data.dog ?? res.data;
      }

      useDogStore.getState().addDog(responseData);
      router.push("/feed");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create dog profile. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i < step
                  ? "bg-primary-600 text-white"
                  : i === step
                    ? "bg-primary-600 text-white ring-2 ring-primary-300 ring-offset-2"
                    : "bg-surface-200 text-surface-500 dark:bg-surface-700 dark:text-surface-400"
              )}
            >
              {i < step ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={cn(
                "mt-1 text-[10px] font-medium",
                i <= step
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-surface-400 dark:text-surface-500"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "mb-4 h-0.5 w-8 sm:w-12",
                i < step ? "bg-primary-600" : "bg-surface-200 dark:bg-surface-700"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );

  // Step 1: Basics
  const renderBasicsStep = () => (
    <div className="space-y-4">
      <Input
        id="name"
        label="Dog's name"
        placeholder="e.g. Buddy"
        error={errors.name?.message}
        {...register("name")}
      />

      <Input
        id="username"
        label="Username (@handle)"
        placeholder="e.g. buddy_the_lab"
        error={errors.username?.message}
        {...register("username")}
      />

      <div className="relative w-full">
        <Input
          id="breed"
          label="Breed"
          placeholder="Start typing a breed..."
          autoComplete="off"
          error={errors.breed?.message}
          {...register("breed", {
            onChange: (e) => handleBreedInput(e.target.value),
          })}
          onFocus={() => {
            if (watchedValues.breed && breedSuggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay so click on suggestion registers
            setTimeout(() => setShowSuggestions(false), 150);
          }}
        />
        {showSuggestions && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-surface-200 bg-white shadow-lg dark:border-surface-600 dark:bg-surface-800">
            {breedSuggestions.map((breed) => (
              <li key={breed}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-surface-700 hover:bg-primary-50 dark:text-surface-200 dark:hover:bg-surface-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectBreed(breed)}
                >
                  {breed}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Input
        id="dateOfBirth"
        label="Date of birth (optional)"
        type="date"
        error={errors.dateOfBirth?.message}
        {...register("dateOfBirth")}
      />
    </div>
  );

  // Step 2: Size & Personality
  const renderPersonalityStep = () => (
    <div className="space-y-6">
      {/* Size selector */}
      <div>
        <label className="mb-2 block text-sm font-medium text-surface-700 dark:text-surface-300">
          Size
        </label>
        <div className="grid grid-cols-2 gap-3">
          {SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("size", opt.value, { shouldValidate: true })}
              className={cn(
                "flex flex-col items-center rounded-lg border-2 px-4 py-3 text-center transition-all",
                watchedValues.size === opt.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-surface-200 bg-white hover:border-surface-300 dark:border-surface-600 dark:bg-surface-800 dark:hover:border-surface-500"
              )}
            >
              <span
                className={cn(
                  "text-sm font-semibold",
                  watchedValues.size === opt.value
                    ? "text-primary-700 dark:text-primary-300"
                    : "text-surface-700 dark:text-surface-200"
                )}
              >
                {opt.label}
              </span>
              <span className="mt-0.5 text-xs text-surface-500 dark:text-surface-400">
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Personality traits */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300">
          Personality traits (pick 3-5)
        </label>
        {errors.personalityTraits?.message && (
          <p className="mb-2 text-xs text-red-500">
            {errors.personalityTraits.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {PERSONALITY_TRAITS.map((trait) => {
            const selected = watchedValues.personalityTraits.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => toggleTrait(trait)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-all",
                  selected
                    ? "border-primary-500 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "border-surface-300 bg-white text-surface-600 hover:border-surface-400 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-surface-500"
                )}
              >
                {trait}
              </button>
            );
          })}
        </div>
      </div>

      {/* Temperament notes */}
      <div className="w-full">
        <label
          htmlFor="temperamentNotes"
          className="mb-1.5 block text-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Temperament notes (optional)
        </label>
        <textarea
          id="temperamentNotes"
          rows={3}
          placeholder="Anything else about your dog's personality..."
          className="block w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500"
          {...register("temperamentNotes")}
        />
      </div>
    </div>
  );

  // Step 3: Photo
  const renderPhotoStep = () => (
    <div className="flex flex-col items-center space-y-4">
      <p className="text-center text-sm text-surface-500 dark:text-surface-400">
        Add a profile photo for your dog (optional -- you can always add one later).
      </p>

      {avatarPreview ? (
        <div className="relative">
          <img
            src={avatarPreview}
            alt="Dog avatar preview"
            className="h-40 w-40 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/30"
          />
          <button
            type="button"
            onClick={removeAvatar}
            className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-40 w-40 flex-col items-center justify-center rounded-full border-2 border-dashed border-surface-300 bg-surface-50 text-surface-400 transition-colors hover:border-primary-400 hover:text-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-500 dark:hover:border-primary-500 dark:hover:text-primary-400"
        >
          <svg className="mb-2 h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
          <span className="text-xs font-medium">Upload photo</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {avatarPreview && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Change photo
        </Button>
      )}
    </div>
  );

  // Step 4: Review
  const renderReviewStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        {/* Avatar + name header */}
        <div className="flex items-center gap-4">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Dog avatar"
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <span className="text-xl font-bold">
                {watchedValues.name?.charAt(0)?.toUpperCase() || "?"}
              </span>
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50">
              {watchedValues.name || "Unnamed"}
            </h3>
            <p className="text-sm text-surface-500">
              @{watchedValues.username || "---"}
            </p>
          </div>
        </div>

        <hr className="my-4 border-surface-200 dark:border-surface-700" />

        {/* Details grid */}
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="font-medium text-surface-500 dark:text-surface-400">Breed</dt>
            <dd className="text-surface-900 dark:text-surface-100">
              {watchedValues.breed || "---"}
            </dd>
          </div>
          {watchedValues.dateOfBirth && (
            <div className="flex justify-between">
              <dt className="font-medium text-surface-500 dark:text-surface-400">Date of birth</dt>
              <dd className="text-surface-900 dark:text-surface-100">
                {watchedValues.dateOfBirth}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-medium text-surface-500 dark:text-surface-400">Size</dt>
            <dd className="text-surface-900 dark:text-surface-100">
              {SIZE_OPTIONS.find((o) => o.value === watchedValues.size)?.label ?? watchedValues.size}
            </dd>
          </div>
          <div>
            <dt className="mb-1 font-medium text-surface-500 dark:text-surface-400">Personality</dt>
            <dd className="flex flex-wrap gap-1.5">
              {watchedValues.personalityTraits.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                >
                  {t}
                </span>
              ))}
            </dd>
          </div>
          {watchedValues.temperamentNotes && (
            <div>
              <dt className="mb-1 font-medium text-surface-500 dark:text-surface-400">
                Temperament notes
              </dt>
              <dd className="text-surface-700 dark:text-surface-300">
                {watchedValues.temperamentNotes}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const stepContent = [
    renderBasicsStep,
    renderPersonalityStep,
    renderPhotoStep,
    renderReviewStep,
  ];

  return (
    <div className="flex min-h-[calc(100vh-57px)] items-start justify-center px-4 py-8 sm:items-center">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-surface-900 dark:text-surface-50">
            Create your dog&apos;s profile
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Tell us about your furry friend to get started on Hobak.
          </p>
        </div>

        {/* Step indicator */}
        <div className="mt-6">{renderStepIndicator()}</div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Current step content */}
          {stepContent[step]()}

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={prevStep}>
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Continue
              </Button>
            ) : (
              <Button type="submit" isLoading={isSubmitting}>
                Create profile
              </Button>
            )}
          </div>
        </form>

        {/* Skip link for photo step */}
        {step === 2 && !avatarPreview && (
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={nextStep}
              className="text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            >
              Skip for now
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
