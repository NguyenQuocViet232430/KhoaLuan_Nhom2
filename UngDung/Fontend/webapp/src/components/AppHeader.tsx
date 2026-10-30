import { useEffect, useRef, useState } from 'react';
import { Image, BarChart3, GitFork, History, Settings, Sun, Moon, Split, Network, Presentation, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changeAppLanguage } from '../i18n';
import type { ActiveTab, ThemeMode } from '../types';

interface AppHeaderProps {
  currentTab: ActiveTab; onTabChange: (tab: ActiveTab) => void;
  theme: ThemeMode; onToggleTheme: () => void; apiMode: 'mock' | 'real';
  backendOnline: boolean; onOpenPresentation: () => void;
}
const groups = [
  { vi: 'Demo', en: 'Demo', items: [
    { id: 'workspace', vi: 'Tạo chú thích', en: 'Caption', icon: Image },
    { id: 'comparison', vi: 'So sánh', en: 'Compare', icon: Split },
    { id: 'history', vi: 'Lịch sử', en: 'History', icon: History },
  ] },
  { vi: 'Nghiên cứu', en: 'Research', items: [
    { id: 'architecture', vi: 'Kiến trúc', en: 'Architecture', icon: Network },
    { id: 'evaluation', vi: 'Đánh giá', en: 'Evaluation', icon: BarChart3 },
    { id: 'ablation', vi: 'Thử nghiệm thành phần', en: 'Ablation study', icon: GitFork },
  ] },
] as const;

export function AppHeader({ currentTab, onTabChange, theme, onToggleTheme, apiMode, backendOnline, onOpenPresentation }: AppHeaderProps) {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const active = groups.flatMap(group => [...group.items]).find(item => item.id === currentTab);
  const location = active ? (vi ? active.vi : active.en) : currentTab === 'settings' ? (vi ? 'Cài đặt' : 'Settings') : 'RAIC';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (menuOpen) dialog?.showModal();
    else if (dialog?.open) dialog.close();
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => { document.body.style.overflow = previousOverflow; desktop.removeEventListener('change', closeOnDesktop); };
  }, [menuOpen]);

  const navigate = (tab: ActiveTab) => { onTabChange(tab); setMenuOpen(false); window.scrollTo({ top: 0 }); };
  const brand = <div className="studio-brand"><span className="studio-wordmark">RAIC</span><span className="studio-brand-meta">Image captioning</span></div>;
  const navigation = <nav aria-label={vi ? 'Điều hướng chính' : 'Main navigation'} className="studio-navigation">
    {groups.map(group => <div key={group.en} className="nav-group">
      <p className="nav-group-title">{vi ? group.vi : group.en}</p>
      {group.items.map(({ id, vi: label, en, icon: Icon }) => <button key={id} type="button" onClick={() => navigate(id)}
        aria-current={currentTab === id ? 'page' : undefined} className={'studio-nav-item' + (currentTab === id ? ' is-active' : '')}>
        <Icon size={17} strokeWidth={1.6} aria-hidden="true" /><span>{vi ? label : en}</span>
      </button>)}
    </div>)}
  </nav>;
  const status = apiMode === 'mock' ? (vi ? 'Dữ liệu mô phỏng' : 'Simulated data') : backendOnline ? (vi ? 'Mô hình sẵn sàng' : 'Model ready') : (vi ? 'Chưa kết nối' : 'Disconnected');
  return <>
    <a href="#main-content" className="skip-link">{vi ? 'Đến nội dung' : 'Skip to content'}</a>
    <aside className="studio-sidebar">
      {brand}{navigation}<p className="sidebar-bottom">HUIT · Nhóm 02 · Level 5A · Seed 46</p>
    </aside>
    <header className="studio-topbar"><div className="topbar-inner">
      <div className="topbar-location">
        <button ref={menuButtonRef} type="button" aria-label={vi ? 'Mở menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(true)} className="studio-icon-button mobile-menu-button"><Menu size={20} /></button>
        <span className="topbar-page-name">{location}</span>
      </div>
      <div className="topbar-actions">
        <button type="button" className={'connection-label' + (backendOnline && apiMode === 'real' ? ' is-online' : '')} onClick={() => navigate('settings')} title={vi ? 'Cài đặt kết nối' : 'Connection settings'}>
          <span className={'connection-dot' + (backendOnline && apiMode === 'real' ? ' is-online' : '')} />{status}
        </button>
        <div className="studio-language" role="group" aria-label={vi ? 'Ngôn ngữ' : 'Language'}>
          {(['vi', 'en'] as const).map(lang => <button key={lang} type="button" aria-label={lang === 'vi' ? 'Tiếng Việt' : 'English'}
            aria-pressed={i18n.language.startsWith(lang)} onClick={() => changeAppLanguage(lang)}>{lang.toUpperCase()}</button>)}
        </div>
        <button type="button" onClick={onToggleTheme} aria-label={vi ? (theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối') : (theme === 'dark' ? 'Light mode' : 'Dark mode')}
          title={vi ? 'Đổi giao diện sáng / tối' : 'Toggle theme'} className="studio-icon-button">{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button type="button" onClick={() => navigate('settings')} aria-label={vi ? 'Cài đặt' : 'Settings'} className="studio-icon-button" aria-pressed={currentTab === 'settings'}><Settings size={17} /></button>
        <button type="button" onClick={onOpenPresentation} aria-label={vi ? 'Trình chiếu' : 'Presentation'} title={vi ? 'Trình chiếu' : 'Presentation'} className="studio-icon-button"><Presentation size={17} /></button>
      </div>
    </div></header>
    <dialog ref={dialogRef} id="mobile-navigation" aria-labelledby="mobile-navigation-title"
      onCancel={() => setMenuOpen(false)} onClose={() => { setMenuOpen(false); menuButtonRef.current?.focus(); }}
      onClick={event => { if (event.target === event.currentTarget) setMenuOpen(false); }} className="studio-mobile-dialog">
      <div className="mobile-dialog-heading"><div id="mobile-navigation-title">{brand}</div>
        <button type="button" onClick={() => setMenuOpen(false)} aria-label={vi ? 'Đóng menu' : 'Close menu'} className="studio-icon-button"><X size={20} /></button>
      </div>{navigation}<p className="sidebar-bottom">HUIT · Nhóm 02 · Level 5A · Seed 46</p>
    </dialog>
  </>;
}

