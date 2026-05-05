import api from "../axios";

export interface Room {
  id: number;
  name: string;
  capacity: number;
  description: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
}

export interface CreateRoomRequest {
  name: string;
  capacity: number;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateRoomRequest {
  name?: string;
  capacity?: number;
  description?: string;
  status?: "active" | "inactive";
}

export const getRoomsList = async (active_only: boolean = false) => {
  const response = await api.get(`/admin/rooms`, {
    params: { active_only }
  });
  return response.data; // List of Room
};

export const createRoom = async (data: CreateRoomRequest) => {
  const response = await api.post(`/admin/rooms`, data);
  return response.data;
};

export const updateRoom = async (id: number, data: UpdateRoomRequest) => {
  const response = await api.put(`/admin/rooms/${id}`, data);
  return response.data;
};

export const deleteRoom = async (id: number) => {
  const response = await api.delete(`/admin/rooms/${id}`);
  return response.data;
};
