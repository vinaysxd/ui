import api from "../lib/api";
import { getErrorMessage } from "../constants/errors";

export interface SiteTask {
  id: string;
  site_id: string;
  label: string;
  created_at?: string;
}

export const getSiteTasks = async (site_id: string): Promise<SiteTask[]> => {
  try {
    const response = await api.get(`/tasks/${site_id}`);
    return response.data.tasks;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const addSiteTask = async (site_id: string, label: string): Promise<SiteTask> => {
  try {
    const response = await api.post(`/tasks/${site_id}`, { label });
    return response.data.task;
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};

export const deleteSiteTask = async (site_id: string, task_id: string): Promise<void> => {
  try {
    await api.delete(`/tasks/${site_id}/${task_id}`);
  } catch (error: any) {
    const code = error?.response?.data?.code;
    throw new Error(getErrorMessage(code));
  }
};
