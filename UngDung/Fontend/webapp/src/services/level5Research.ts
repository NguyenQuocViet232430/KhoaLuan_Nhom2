// Recorded Drive results, 2026-10-13. Scores use x100; they are not upload metrics.
export const LEVEL5_RESEARCH = {
  seed: 46,
  source: 'https://drive.google.com/drive/folders/1Ays7jb7w1tcg6J2fzq5XpMLcAMb39DFI',
  metrics: [
    { name: 'CIDEr', value: 111.36204204808433, mean: 110.77422482071856, std: 0.381376088790889 },
    { name: 'BLEU-1', value: 75.22571556636838, mean: 74.93661459177241, std: 0.1709076976508271 },
    { name: 'BLEU-4', value: 34.846706237459394, mean: 34.66168637345683, std: 0.1701011827954584 },
    { name: 'METEOR', value: 27.194041215454767, mean: 27.137763219355854, std: 0.05973458685916451 },
    { name: 'ROUGE-L', value: 55.81887687544528, mean: 55.67142038312502, std: 0.12978102885984008 },
    { name: 'SPICE', value: 19.84278887476822, mean: 19.801397096277036, std: 0.0668550370761063 },
  ],
} as const;
