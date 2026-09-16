import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface NoteAuthor {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "admin" | "staff" | "client";
}

export interface SiteNote {
  id: string;
  author_id: string;
  site_id: string;
  note: string;
  type: "staff" | "client";
  created_at: string;
  author: NoteAuthor | null;
}

export const getSiteNotes = async (site_id: string): Promise<SiteNote[]> => {
  try {
    const response = await api.get(`/notes/${site_id}`);
    return response.data.notes;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getStaffSiteNotes = async (site_id: string): Promise<SiteNote[]> => {
  try {
    const response = await api.get(`/notes/${site_id}/staff-view`);
    return response.data.notes;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const addStaffNote = async (site_id: string, note: string): Promise<SiteNote> => {
  try {
    const response = await api.post(`/notes/${site_id}`, { note });
    return response.data.note;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getClientSiteNotes = async (site_id: string): Promise<SiteNote[]> => {
  try {
    const response = await api.get(`/notes/${site_id}/client-view`);
    return response.data.notes;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const addClientNote = async (site_id: string, note: string): Promise<SiteNote> => {
  try {
    const response = await api.post(`/notes/${site_id}/client`, { note });
    return response.data.note;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deleteNote = async (site_id: string, note_id: string): Promise<void> => {
  try {
    await api.delete(`/notes/${site_id}/${note_id}`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
