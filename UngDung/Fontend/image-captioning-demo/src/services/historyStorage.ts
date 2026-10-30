export interface CaptionResult {
  caption: string;
  knowledgeList: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  thumbnailBase64: string;
  result: CaptionResult;
  processingTime: number;
}

const STORAGE_KEY = 'capAI_history';
const MAX_HISTORY = 20;

export const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Use jpeg for better compression to fit localStorage
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getHistoryItems = (): HistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse history", error);
    return [];
  }
};

export const saveHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem => {
  const items = getHistoryItems();
  const newItem: HistoryItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };
  
  items.unshift(newItem);
  if (items.length > MAX_HISTORY) {
    items.pop();
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Failed to save history.", error);
    if (items.length > 5) {
       items.splice(5);
       localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }
  return newItem;
};

export const deleteHistoryItem = (id: string): void => {
  const items = getHistoryItems().filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

export const clearHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
