from app.models.membership import MembershipRole, role_rank


def test_owner_outranks_admin_outranks_analyst_outranks_viewer():
    assert role_rank(MembershipRole.ORGANIZATION_OWNER) < role_rank(MembershipRole.ORGANIZATION_ADMIN)
    assert role_rank(MembershipRole.ORGANIZATION_ADMIN) < role_rank(MembershipRole.ANALYST)
    assert role_rank(MembershipRole.ANALYST) < role_rank(MembershipRole.VIEWER)


def test_lower_rank_number_means_more_privilege():
    # RN-009: um papel so pode atribuir a outro um papel igual ou inferior ao proprio.
    owner_rank = role_rank(MembershipRole.ORGANIZATION_OWNER)
    viewer_rank = role_rank(MembershipRole.VIEWER)
    assert owner_rank < viewer_rank
