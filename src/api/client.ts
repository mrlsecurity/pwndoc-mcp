import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import https from "node:https";
import http from "node:http";
import { loadConfig } from "../config.js";
import { PwndocApiError } from "../lib/errors.js";

const cfg = loadConfig();

let instance: AxiosInstance | null = null;

function makeAgents() {
  const httpsAgent = new https.Agent({
    rejectUnauthorized: !cfg.insecureTls,
    keepAlive: true,
  });
  const httpAgent = new http.Agent({ keepAlive: true });
  return { httpsAgent, httpAgent };
}

export function getClient(): AxiosInstance {
  if (instance) return instance;
  const { httpsAgent, httpAgent } = makeAgents();
  instance = axios.create({
    baseURL: cfg.pwndocUrl,
    httpsAgent,
    httpAgent,
    timeout: 30000,
    validateStatus: (s) => s < 500,
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const value = `Bearer ${cfg.apiKey}`;
    if ((config.headers as any).set) {
      (config.headers as any).set("Authorization", value);
    } else {
      (config.headers as any).Authorization = value;
    }
    return config;
  });

  return instance;
}

export function unwrapData<T = any>(resp: { data: any; status?: number }): T {
  const d = resp.data;
  if (d && typeof d === "object" && "status" in d) {
    if (d.status === "success") return d.datas as T;
    const errMsg = typeof d.datas === "string" ? d.datas : d.datas?.message || JSON.stringify(d.datas);
    throw new PwndocApiError(resp.status ?? 400, errMsg);
  }
  return d as T;
}
