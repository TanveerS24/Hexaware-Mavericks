import pytest
from core.models.blocked_users import BlockDurationTier
from core.services.credibility_service import calculate_recovered_score
from core.services.block_service import get_suggested_tier_from_count


def test_block_tier_auto_suggestion():
    """
    Verify progressive block tier suggestion based on prior block occurrences:
    1st block (0 prior) -> 3d
    2nd block (1 prior) -> 10d
    3rd block (2 prior) -> 30d
    4th+ block (3+ prior) -> permanent
    """
    assert get_suggested_tier_from_count(0) == BlockDurationTier.THREE_DAYS
    assert get_suggested_tier_from_count(1) == BlockDurationTier.TEN_DAYS
    assert get_suggested_tier_from_count(2) == BlockDurationTier.THIRTY_DAYS
    assert get_suggested_tier_from_count(3) == BlockDurationTier.PERMANENT
    assert get_suggested_tier_from_count(5) == BlockDurationTier.PERMANENT


def test_credibility_recovery_formula_3_days_block():
    """
    For a 3-day block with score_at_unblock = 0.4:
    block_duration_days = 3
    recovery_period_days = 2 * 3 = 6 days
    target_score = 0.7
    daily_rate = (0.7 - 0.4) / 6 = 0.3 / 6 = 0.05 per day
    """
    score_at_unblock = 0.4
    block_days = 3.0

    # Day 0: score remains 0.4
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=0.0) == 0.4

    # Day 1: 0.4 + 0.05 * 1 = 0.45
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=1.0) == 0.45

    # Day 3 (halfway): 0.4 + 0.05 * 3 = 0.55
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=3.0) == 0.55

    # Day 6 (end of recovery period): 0.4 + 0.05 * 6 = 0.70 (target reached)
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=6.0) == 0.70

    # Day 10 (past recovery): capped at 0.70
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=10.0) == 0.70


def test_credibility_recovery_formula_10_days_block():
    """
    For a 10-day block with score_at_unblock = 0.2:
    block_duration_days = 10
    recovery_period_days = 2 * 10 = 20 days
    target_score = 0.7
    daily_rate = (0.7 - 0.2) / 20 = 0.5 / 20 = 0.025 per day
    """
    score_at_unblock = 0.2
    block_days = 10.0

    # Day 0
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=0.0) == 0.2

    # Day 10 (halfway): 0.2 + 0.025 * 10 = 0.45
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=10.0) == 0.45

    # Day 20 (full period): 0.2 + 0.025 * 20 = 0.70
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=20.0) == 0.70

    # Day 30: capped at 0.70
    assert calculate_recovered_score(score_at_unblock, block_days, days_since_unblock=30.0) == 0.70


def test_credibility_recovery_when_already_above_target():
    """
    If score_at_unblock is already 0.75 (above target 0.70), it remains at 0.70 target.
    """
    assert calculate_recovered_score(0.75, 3.0, 2.0) == 0.70
