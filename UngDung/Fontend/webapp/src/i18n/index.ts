import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { vi } from './locales/vi';
import { en } from './locales/en';

const savedLang = localStorage.getItem('raic_lang') || 'vi';
document.documentElement.lang = savedLang.startsWith('vi') ? 'vi' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      vi: { translation: vi },
      en: { translation: en }
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already safes from XSS
    }
  });

export const changeAppLanguage = (lang: 'vi' | 'en') => {
  document.documentElement.lang = lang;
  i18n.changeLanguage(lang);
  localStorage.setItem('raic_lang', lang);
};

export default i18n;
