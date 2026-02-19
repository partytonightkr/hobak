import { create } from "zustand";
import api from "@/lib/api";

export interface Dog {
  id: string;
  name: string;
  username: string;
  breed: string;
  dateOfBirth: string | null;
  size: "SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE";
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  personalityTraits: string[];
  temperamentNotes: string | null;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
}

interface DogState {
  dogs: Dog[];
  activeDog: Dog | null;
  isLoading: boolean;

  fetchDogs: () => Promise<void>;
  setActiveDog: (dog: Dog) => void;
  addDog: (dog: Dog) => void;
  updateDog: (id: string, data: Partial<Dog>) => void;
}

export const useDogStore = create<DogState>((set, get) => ({
  dogs: [],
  activeDog: null,
  isLoading: true,

  fetchDogs: async () => {
    try {
      const { data } = await api.get("/dogs/me");
      const dogs = data.data ?? data.dogs ?? [];
      set({ dogs, isLoading: false });
      // Set active dog to the first one if not set
      if (!get().activeDog && dogs.length > 0) {
        set({ activeDog: dogs[0] });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveDog: (dog) => set({ activeDog: dog }),

  addDog: (dog) =>
    set((state) => ({
      dogs: [...state.dogs, dog],
      activeDog: state.activeDog ?? dog,
    })),

  updateDog: (id, data) =>
    set((state) => ({
      dogs: state.dogs.map((d) => (d.id === id ? { ...d, ...data } : d)),
      activeDog: state.activeDog?.id === id ? { ...state.activeDog, ...data } : state.activeDog,
    })),
}));
