export interface KnowledgeItem {
  id: string;
  type: "caption" | "triple" | "attribute" | "relation" | "object";
  content: string;
  score: number; // 0-1
}

export interface CaptionResult {
  baselineCaption: string;
  enhancedCaption: string;
  retrievedKnowledge: KnowledgeItem[];
}

export const captionImage = async (file: File): Promise<CaptionResult> => {
  // Simulate network delay and processing time
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Simulate random failure (10% chance) to demonstrate error handling
      if (Math.random() < 0.1) {
        reject(new Error("Lỗi kết nối đến máy chủ mô hình. Vui lòng thử lại."));
        return;
      }

      resolve({
        baselineCaption: "A white dog running on the grass.",
        enhancedCaption: "A fluffy Samoyed dog playfully running on lush green grass during a sunny day.",
        retrievedKnowledge: [
          {
            id: "k1",
            type: "object",
            content: "Samoyed dog",
            score: 0.95
          },
          {
            id: "k2",
            type: "attribute",
            content: "fluffy white fur",
            score: 0.88
          },
          {
            id: "k3",
            type: "triple",
            content: "<dog> <is on> <grass>",
            score: 0.92
          },
          {
            id: "k4",
            type: "caption",
            content: "A white dog jumping in a grassy field.",
            score: 0.75
          }
        ]
      });
    }, 4000); // 4 seconds total processing time for demo purposes
  });
};
