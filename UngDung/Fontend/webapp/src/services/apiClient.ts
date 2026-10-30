import type { AnalysisResult } from '../types';
import { analyzeImageMock, analyzeSampleMock } from './mock_api';
import { normalizeBackendCaptionResponse } from './responseValidator';
import i18n from '../i18n';

const API_MODE = (import.meta.env.VITE_API_MODE as 'mock' | 'real') || 'real';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_URL_STORAGE_KEY = 'raic_backend_url';

function normalizeBaseUrl(value: string): string {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Enter an HTTP or HTTPS server URL.');
  }
  return url.toString().replace(/\/+$/, '');
}

function savedBaseUrl(): string {
  try { return normalizeBaseUrl(localStorage.getItem(API_URL_STORAGE_KEY) || API_BASE_URL); }
  catch { return API_BASE_URL; }
}

export interface HealthCheckResponse {
  status: 'online' | 'offline';
  model_loaded: boolean;
  model_name?: string;
  device?: string;
  error?: string;
}

class ApiService {
  private mode: 'mock' | 'real' = API_MODE === 'real' ? 'real' : 'mock';
  private baseUrl: string = savedBaseUrl();

  public getMode(): 'mock' | 'real' {
    return this.mode;
  }

  public setMode(mode: 'mock' | 'real') {
    this.mode = mode;
  }

  public setBaseUrl(url: string) {
    const normalized = normalizeBaseUrl(url);
    localStorage.setItem(API_URL_STORAGE_KEY, normalized);
    this.baseUrl = normalized;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Health check to detect if FastAPI is active and model is loaded
   */
  async checkHealth(signal?: AbortSignal): Promise<HealthCheckResponse> {
    if (this.mode === 'mock') {
      return {
        status: 'online',
        model_loaded: true,
        model_name: 'RAIC Research Simulator (Level 1-4)',
        device: 'Browser simulator'
      };
    }

    try {
      const timeout = AbortSignal.timeout(5000);
      const res = await fetch(`${this.baseUrl}/api/health`, { method: 'GET', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (!res.ok) {
        return { status: 'offline', model_loaded: false, error: `HTTP ${res.status}` };
      }
      const data = await res.json();
      return {
        status: data.status === 'online' ? 'online' : 'offline',
        model_loaded: Boolean(data.model_loaded),
        model_name: data.model_name,
        device: data.device,
        error: data.error
      };
    } catch (err: any) {
      return {
        status: 'offline',
        model_loaded: false,
        error: err?.message || 'Could not reach server'
      };
    }
  }

  async analyzeImage(file: File, signal?: AbortSignal): Promise<AnalysisResult> {
    if (this.mode === 'mock') {
      return analyzeImageMock(file);
    }

    // In Live Mode: verify backend connectivity first
    const health = await this.checkHealth(signal);
    if (health.status !== 'online' || !health.model_loaded) {
      throw new Error(i18n.t('uploader.errorBackend', { address: this.baseUrl }));
    }

    const formData = new FormData();
    formData.append('image', file); // Matches image-captioning-baseline router parameter

    const targetEndpoint = `${this.baseUrl}/api/caption`;
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      body: formData,
      signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Inference API Error (${response.status}): ${errText || response.statusText}`);
    }

    const data = await response.json();
    const imageUrl = URL.createObjectURL(file);
    try {
      return normalizeBackendCaptionResponse(data, imageUrl, file.name);
    } catch (error) {
      URL.revokeObjectURL(imageUrl);
      throw error;
    }
  }

  async analyzeSample(sampleId: string): Promise<AnalysisResult> {
    if (this.mode === 'mock') {
      return analyzeSampleMock(sampleId);
    }

    throw new Error('Live sample analysis requires local image upload in Real Mode.');
  }
}

export const apiService = new ApiService();
