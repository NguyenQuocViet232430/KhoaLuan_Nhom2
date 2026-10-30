import type { ErrorAnalysisCase } from '../types';

export const ERROR_ANALYSIS_CASES: ErrorAnalysisCase[] = [
  {
    id: 'case-1',
    title: 'Case 1: Specificity Boost via Candidate Retrieval',
    category: 'retrieval_success',
    imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    imageCaptionGroundTruth: 'A golden retriever dog leaps in midair to catch a red frisbee in a sunny park.',
    baselineCaption: 'A dog jumping in a field with a toy.',
    baselineIssue: 'Generic visual tokens ("dog", "toy", "field") lacking breed identification and specific recreational action context.',
    retrievedEvidence: [
      'MS COCO #48102: "A golden retriever jumping into the air to catch a frisbee in a park." (Sim: 0.924)',
      'MS COCO #11904: "A brown and white dog catching a plastic red disc mid air on grass." (Sim: 0.895)'
    ],
    raicCaption: 'A golden retriever leaps across a sunny grass field to catch a red flying disc.',
    gatingMechanismEffect: 'Gating coefficient gamma spiked to 0.76 - 0.82 on tokens "golden retriever" and "flying disc", pulling fine-grained vocabulary from top-ranked candidates while grounding "grass field" in vision attention.',
    ciderImprovement: '+0.38 CIDEr (1.02 -> 1.40)'
  },
  {
    id: 'case-2',
    title: 'Case 2: Distractor Filtering via Confidence-Aware Gating',
    category: 'distractor_filtering',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    imageCaptionGroundTruth: 'A male surfer in black wetsuit riding a cresting turquoise wave.',
    baselineCaption: 'A person on a surfboard in the water near rocks.',
    baselineIssue: 'Baseline hallucinates non-existent "rocks" based on standard seascape priors in training distribution.',
    retrievedEvidence: [
      'MS COCO #33190 (Distractor): "A surfer riding waves near a rocky jetty with seagulls." (Sim: 0.742, Pruned by gate)',
      'MS COCO #88412: "A man surfing a large barrel wave in the ocean." (Sim: 0.887, Admitted)'
    ],
    raicCaption: 'A surfer in a wetsuit maneuvers through a breaking blue ocean wave.',
    gatingMechanismEffect: 'When distractor candidate introduced "rocky jetty", visual cross-attention reported low spatial grounding (score < 0.15). The confidence gate suppressed knowledge injection (gamma < 0.22), preventing CHAIR hallucination.',
    ciderImprovement: '+0.29 CIDEr (1.11 -> 1.40), CHAIR-s reduced from 14.2% to 0.0%'
  },
  {
    id: 'case-3',
    title: 'Case 3: Reranker Inversion (Level 2 vs Level 3 Rerank Correction)',
    category: 'rerank_correction',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    imageCaptionGroundTruth: 'A black vintage steam locomotive pulling passenger cars through countryside railway.',
    baselineCaption: 'A train moving on the train tracks near trees.',
    baselineIssue: 'Omits the historical/antique domain ("steam locomotive") and passenger train context.',
    retrievedEvidence: [
      'Raw FAISS #1 (Visual texture match): "A modern passenger commuter train traveling at high speed." (Sim: 0.841 -> Penalized to rank #8)',
      'Reranked #1 (Object consistency match): "An antique steam locomotive spewing smoke along rural railroad tracks." (Sim: 0.825 -> Rerank Score: 0.932)'
    ],
    raicCaption: 'A vintage steam locomotive travels along countryside railway tracks with passenger coaches.',
    gatingMechanismEffect: 'Object detection detected "steam", "chimney", "boiler". Level 3 semantic reranker elevated antique locomotive captions by +7 positions, feeding the decoder correct domain terminology.',
    ciderImprovement: '+0.34 CIDEr (0.98 -> 1.32)'
  },
  {
    id: 'case-4',
    title: 'Case 4: Rare Entity and Activity Grounding',
    category: 'rare_entity_boost',
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&w=800&q=80',
    imageCaptionGroundTruth: 'A snowboarder performing a grab trick off a snowy mountain ridge jump.',
    baselineCaption: 'A person standing in the snow on skis.',
    baselineIssue: 'Baseline mistakes snowboard for skis and misclassifies airborne jump as static standing.',
    retrievedEvidence: [
      'MS COCO #10428: "A young snowboarder performs an aerial jump off a snow ramp." (Sim: 0.892)',
      'MS COCO #58190: "A snowboarder catching air over a powdery mountain slope." (Sim: 0.865)'
    ],
    raicCaption: 'A snowboarder performs an aerial trick mid-jump over snow-covered mountain terrain.',
    gatingMechanismEffect: 'Dual cross-attention resolved posture dynamics. High knowledge gate on "aerial trick" combined with visual attention on airborne bounding box resolved the posture confusion.',
    ciderImprovement: '+0.41 CIDEr (0.91 -> 1.32)'
  }
];
