import { create } from "zustand";
import { api, Room, RoomActivityDay } from "@/lib/api";

interface RoomStore {
  rooms: Room[];
  currentRoom: Room | null;
  roomHeatmap: RoomActivityDay[];
  loading: boolean;
  fetchRooms: () => Promise<void>;
  fetchRoom: (id: string) => Promise<void>;
  fetchRoomHeatmap: (id: string) => Promise<void>;
  addRoom: (room: Room) => void;
  updateRoom: (room: Room) => void;
  removeRoom: (id: string) => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  rooms: [],
  currentRoom: null,
  roomHeatmap: [],
  loading: false,

  fetchRooms: async () => {
    set({ loading: true });
    try {
      const rooms = await api.rooms.list();
      set({ rooms });
    } finally {
      set({ loading: false });
    }
  },

  fetchRoom: async (id) => {
    set({ loading: true });
    try {
      const currentRoom = await api.rooms.get(id);
      set({ currentRoom });
    } finally {
      set({ loading: false });
    }
  },

  fetchRoomHeatmap: async (id) => {
    const roomHeatmap = await api.rooms.activityHeatmap(id);
    set({ roomHeatmap });
  },

  addRoom: (room) => set((s) => ({ rooms: [room, ...s.rooms] })),
  updateRoom: (room) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === room.id ? room : r)),
      currentRoom: s.currentRoom?.id === room.id ? room : s.currentRoom,
    })),
  removeRoom: (id) =>
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
      currentRoom: s.currentRoom?.id === id ? null : s.currentRoom,
    })),
}));
