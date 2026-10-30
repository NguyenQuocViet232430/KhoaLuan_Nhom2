import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiService } from '../services/apiClient';
import type { HealthCheckResponse } from '../services/apiClient';

interface SettingsPanelProps {
  apiMode: 'mock' | 'real';
  onApiModeChange: (mode: 'mock' | 'real') => void;
  onRefreshHealth: () => Promise<HealthCheckResponse>;
}

export function SettingsPanel({ apiMode, onApiModeChange, onRefreshHealth }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [backendUrl, setBackendUrl] = useState(apiService.getBaseUrl());
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const fetchHealth = useCallback(async () => {
    const id = ++requestId.current;
    setIsChecking(true);
    const result = await onRefreshHealth();
    if (id !== requestId.current) return;
    setHealth(result);
    setIsChecking(false);
  }, [onRefreshHealth]);

  useEffect(() => {
    const id = ++requestId.current;
    void onRefreshHealth().then(result => {
      if (id !== requestId.current) return;
      setHealth(result);
      setIsChecking(false);
    });
    return () => { requestId.current += 1; };
  }, [apiMode, onRefreshHealth]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    setError('');
    try {
      apiService.setBaseUrl(backendUrl);
      setBackendUrl(apiService.getBaseUrl());
      setSaved(true);
      await fetchHealth();
    } catch {
      setError(t('settings.invalidUrl'));
    }
  };
  const online = health?.status === 'online' && health.model_loaded;
  const connectionState = apiMode === 'mock' ? 'mock' : isChecking ? 'checking' : online ? 'online' : 'offline';

  return <section className="settings-page"><header className="page-heading"><h1>{t('settings.title')}</h1><p>{t('settings.subtitle')}</p></header>
    <section className="settings-section">
      <div className="settings-connection"><div><h2>{t('settings.connectionTitle')}</h2><p role="status" className={connectionState === 'online' ? 'status-online' : ''}>{t('settings.' + connectionState)}</p></div>
        <button type="button" onClick={fetchHealth} disabled={isChecking} className="subtle-button"><RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />{t('settings.refresh')}</button></div>
      <p className="section-note">{t('settings.' + connectionState + 'Help')}</p>
      {apiMode === 'real' && online && <dl className="technical-data"><div><dt>{t('settings.model')}</dt><dd>{health?.model_name}</dd></div><div><dt>{t('settings.device')}</dt><dd>{health?.device || '—'}</dd></div></dl>}
      {apiMode === 'real' && !isChecking && health?.error && <details className="details-section"><summary>{t('settings.details')}</summary><p className="section-note">{health.error}</p></details>}
      <form onSubmit={handleSave} className="settings-form"><label htmlFor="backend-url">{t('settings.backendUrl')}</label><div>
        <input id="backend-url" required type="url" value={backendUrl} onChange={event => { setBackendUrl(event.target.value); setSaved(false); setError(''); }} spellCheck={false} aria-describedby="backend-url-help" placeholder="http://localhost:8000" />
        <button type="submit" disabled={isChecking} className="studio-primary-button">{t('settings.saveConnection')}</button></div>
        <p id="backend-url-help" className="section-note">{t('settings.urlHelp')}</p>
        {saved && <p role="status" className="section-note">{t('settings.saved')}</p>}
        {error && <p role="alert" className="notice">{error}</p>}
      </form>
    </section>
    <section className="settings-section"><fieldset><legend><h2>{t('settings.modeTitle')}</h2></legend><p className="section-note">{t('settings.modeHelp')}</p>
      <div className="mode-options">{(['real', 'mock'] as const).map(mode => <label key={mode}><input type="radio" name="api-mode" value={mode} checked={apiMode === mode} onChange={() => { setSaved(false); setHealth(null); setIsChecking(true); onApiModeChange(mode); }} />
        <span>{t('settings.' + mode + 'Mode')}<small>{t('settings.' + mode + 'Description')}</small></span></label>)}</div></fieldset></section>
    <section className="settings-section"><h2>{t('settings.configTitle')}</h2><p className="section-note">{t('settings.configHelp')}</p>
      <dl className="technical-data">{[['candidates', '50'], ['captions', '5'], ['memory', '5']].map(([key, value]) => <div key={key}><dt>{t('settings.' + key)}</dt><dd>{value}</dd></div>)}</dl>
      <p className="section-note">{t('settings.architecture')}</p>{apiMode === 'mock' && <p className="section-note">{t('settings.mockConfigNote')}</p>}
    </section>
  </section>;
}

