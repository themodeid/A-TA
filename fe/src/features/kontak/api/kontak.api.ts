import axios from "axios";
import type { Kontak } from "../types/kontak.types";

export const getKontakPage = async (
  apiUrl: string,
  page: number,
): Promise<Kontak[]> => {
  const res = await axios.get(`${apiUrl}?page=${page}`);
  return res.data.data ?? [];
};

export const createKontak = async (
  apiUrl: string,
  payload: { nama: any; umur: number; hobi: any },
) => {
  await axios.post(apiUrl, payload);
};

export const getKontakById = async (
  apiUrl: string,
  id: string,
): Promise<Kontak> => {
  const res = await axios.get(`${apiUrl}/${id}`);
  return res.data.data;
};

export const updateKontak = async (
  apiUrl: string,
  id: string,
  payload: { nama: any; umur: number; hobi: any },
) => {
  await axios.put(`${apiUrl}/${id}`, payload);
};

export const deleteKontak = async (apiUrl: string, id: string) => {
  await axios.delete(`${apiUrl}/${id}`);
};

