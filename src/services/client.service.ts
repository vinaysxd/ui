import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface Client {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "client";
  avatar_url: string | null;
  is_active: boolean;
  created_at?: string;
  profile_id?: string;
  company_name?: string | null;
  billing_address?: string | null;
  contact_person?: string | null;
}

export interface ClientUpdatePayload {
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  company_name?: string;
  billing_address?: string;
  contact_person?: string;
}

export interface ClientInvitePayload {
  full_name: string;
  email: string;
  phone: string;
  company_name?: string;
  billing_address?: string;
  contact_person?: string;
}

export interface InvitedClient {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "client";
}

export const getAllClients = async (): Promise<Client[]> => {
  try {
    const response = await api.get("/admin/clients");
    return response.data.clients;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getClient = async (id: string): Promise<Client> => {
  try {
    const response = await api.get(`/admin/clients/${id}`);
    return response.data.client;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const updateClient = async (id: string, data: ClientUpdatePayload): Promise<Client> => {
  try {
    const response = await api.put(`/admin/clients/${id}`, data);
    return response.data.client;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deactivateClient = async (id: string): Promise<void> => {
  try {
    await api.delete(`/admin/clients/${id}`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const reactivateClient = async (id: string): Promise<void> => {
  try {
    await api.patch(`/admin/clients/${id}/reactivate`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const inviteClient = async (data: ClientInvitePayload): Promise<InvitedClient> => {
  try {
    const response = await api.post("/admin/invite", { ...data, role: "client" });
    return response.data.user;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
