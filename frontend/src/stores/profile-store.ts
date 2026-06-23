import { create } from "zustand";
import { api, Profile } from "@/lib/api";

interface ProfileStore {
  profile: Profile | null;
  loading: boolean;
  fetchProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<Profile>;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  loading: false,

  fetchProfile: async () => {
    set({ loading: true });
    try {
      const profile = await api.profiles.me();
      set({ profile });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    const profile = await api.profiles.update(data);
    set({ profile });
    return profile;
  },
}));
