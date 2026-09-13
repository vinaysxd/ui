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
  client: SiteClient | null;
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
