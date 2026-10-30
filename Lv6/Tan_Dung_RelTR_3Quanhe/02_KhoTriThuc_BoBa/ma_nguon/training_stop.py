"""Deterministic early-stopping decision for the paired hybrid study."""
import math


def update(best, stale_epochs, score, epoch, max_epochs, patience, min_delta):
    """Return (improved, new_stale_count, complete, stop_reason)."""
    if (not math.isfinite(score) or (best is not None and not math.isfinite(best)) or
            not 1 <= epoch <= max_epochs or patience < 1 or stale_epochs < 0 or
            not math.isfinite(min_delta) or min_delta < 0):
        raise ValueError('Invalid early-stopping state')
    improved = best is None or score > best + min_delta
    stale = 0 if improved else stale_epochs + 1
    early = stale >= patience and epoch < max_epochs
    complete = early or epoch == max_epochs
    reason = 'early_stopping' if early else ('max_epochs' if complete else None)
    return improved, stale, complete, reason
