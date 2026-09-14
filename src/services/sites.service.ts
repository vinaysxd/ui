import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface SiteClient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  company_name: string | null;
  billing_address: string | null;
  contact_person: string | null;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  client_id: string;
  created_by: string;
  is_active: boolean;
  client?: SiteClient | null;
}

export interface SiteStaffMember {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "staff";
  avatar_url: string | null;
  is_active: boolean;
}

export interface SiteCreatePayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  client_id: string;
}

export interface SiteUpdatePayload {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  client_id?: string;
}

export const getAllSites = async (): Promise<Site[]> => {
  try {
    const response = await api.get("/sites");
    return response.data.sites;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getMySites = async (): Promise<Site[]> => {
  try {
    const response = await api.get("/sites/my-sites");
    return response.data.sites;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getMySite = async (id: string): Promise<Site> => {
  try {
    const response = await api.get(`/sites/my-sites/${id}`);
    return response.data.site;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getClientSites = async (): Promise<Site[]> => {
  try {
    const response = await api.get("/sites/client-sites");
    return response.data.sites;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getClientSite = async (id: string): Promise<Site> => {
  try {
    const response = await api.get(`/sites/client-sites/${id}`);
    return response.data.site;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getSite = async (id: string): Promise<Site> => {
  try {
    const response = await api.get(`/sites/${id}`);
    return response.data.site;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const createSite = async (data: SiteCreatePayload): Promise<Site> => {
  try {
    const response = await api.post("/sites", data);
    return response.data.site;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const updateSite = async (id: string, data: SiteUpdatePayload): Promise<Site> => {
  try {
    const response = await api.put(`/sites/${id}`, data);
    return response.data.site;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deleteSite = async (id: string): Promise<void> => {
  try {
    await api.delete(`/sites/${id}`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deactivateSite = async (id: string): Promise<void> => {
  try {
    await api.patch(`/sites/${id}/deactivate`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const reactivateSite = async (id: string): Promise<void> => {
  try {
    await api.patch(`/sites/${id}/reactivate`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const getSiteStaff = async (id: string): Promise<SiteStaffMember[]> => {
  try {
    const response = await api.get(`/sites/${id}/staff`);
    return response.data.staff;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const assignStaff = async (site_id: string, profile_id: string): Promise<void> => {
  try {
    await api.post(`/sites/${site_id}/assign-staff`, { profile_id });
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const unassignStaff = async (site_id: string, profile_id: string): Promise<void> => {
  try {
    await api.delete(`/sites/${site_id}/unassign-staff`, { data: { profile_id } });
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
