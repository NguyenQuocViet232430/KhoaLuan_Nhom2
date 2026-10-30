from backend.schemas.caption_schema import DiagnosisData

class CaptionDiagnoser:
    """
    Analyzes generated captions for potential issues using heuristics.
    Since ground-truth references are not available here, this module only performs
    intrinsic heuristic checks (e.g., repetition, length constraints).
    """
    def diagnose(self, caption: str) -> DiagnosisData:
        issues = []
        repetition = False
        
        if not caption or not caption.strip():
            issues.append("Empty caption generated.")
            return DiagnosisData(
                status="heuristic_only",
                repetition=False,
                issues=issues
            )
            
        words = caption.lower().replace('.', '').replace(',', '').split()
        
        # Check for consecutive word repetition
        for i in range(len(words) - 1):
            if words[i] == words[i+1] and len(words[i]) > 2:  # ignore short words like "a a"
                repetition = True
                issues.append(f"Repetition detected: '{words[i]}'")
                break
                
        # Check for phrase repetition (n-gram size 2)
        if len(words) >= 4 and not repetition:
            for i in range(len(words) - 3):
                phrase1 = f"{words[i]} {words[i+1]}"
                phrase2 = f"{words[i+2]} {words[i+3]}"
                if phrase1 == phrase2:
                    repetition = True
                    issues.append(f"Phrase repetition detected: '{phrase1}'")
                    break

        if len(words) < 3:
            issues.append("Caption is unusually short.")

        return DiagnosisData(
            status="heuristic_only",
            overall_quality=None,
            semantic_consistency=None,
            repetition=repetition,
            possible_hallucination=False, # Cannot determine without reference/image grounding
            missing_objects=[],
            incorrect_objects=[],
            issues=issues
        )

    def diagnose_with_references(self, prediction: str, references: list) -> dict:
        diagnosis = self.diagnose(prediction).dict()
        diagnosis["status"] = "ground_truth_evaluated"
        diagnosis["ground_truth_available"] = True
        
        if not references:
            return diagnosis
            
        pred_words = set(prediction.lower().replace('.', '').split())
        
        # Simple heuristic for missing objects: 
        # words that appear in ALL references but not in prediction
        common_ref_words = None
        for ref in references:
            ref_words = set(ref.lower().replace('.', '').split())
            if common_ref_words is None:
                common_ref_words = ref_words
            else:
                common_ref_words = common_ref_words.intersection(ref_words)
                
        # Filter out common stop words roughly
        stop_words = {"a", "an", "the", "in", "on", "at", "is", "are", "with", "and"}
        if common_ref_words:
            important_common = common_ref_words - stop_words
            missing = important_common - pred_words
            if missing:
                diagnosis["missing_objects"] = list(missing)
                diagnosis["issues"].append(f"Missing key elements: {', '.join(missing)}")
                
        return diagnosis
