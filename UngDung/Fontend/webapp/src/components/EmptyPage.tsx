import { useTranslation } from 'react-i18next';
interface EmptyPageProps { title: string; description: string; onCreate: () => void; }
export function EmptyPage({ title, description, onCreate }: EmptyPageProps) {
  const { i18n } = useTranslation();
  return <section className="empty-page"><header className="page-heading"><h1>{title}</h1><p>{description}</p></header>
    <button type="button" className="studio-primary-button" onClick={onCreate}>{i18n.language.startsWith('vi') ? 'Tạo chú thích' : 'Generate a caption'}</button>
  </section>;
}

