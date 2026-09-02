"""Funil agregado num intervalo de datas (/analytics/funnel) e a
segmentacao por canal em funnel-snapshots (RF funil multicanal, PR1)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _create_channel(client, org_id: str, name: str = "Google Ads") -> str:
    return client.post(
        f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": name}
    ).json()["id"]


def _upsert_snapshot(client, org_id: str, **payload) -> dict:
    resp = client.put(f"/api/v1/organizations/{org_id}/funnel-snapshots", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_funnel_analytics_aggregates_stages_and_computes_stage_conversions(client):
    org_id = _register_login_and_create_org(client, "funan1@example.com", "Empresa FunAn 1")
    _upsert_snapshot(
        client, org_id, period="2026-06-01",
        impressions=10000, visits=2000, leads=500, mqls=300, sqls=150,
        opportunities=100, customers=40, repeat_purchases=10,
    )

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert body["stages"]["leads"]["value"] == 500
    conversions = {(c["from_stage"], c["to_stage"]): c for c in body["conversions"]}
    leads_to_mqls = conversions[("leads", "mqls")]
    assert leads_to_mqls["conversion_rate"]["value"] == 0.6
    assert round(leads_to_mqls["drop_off_rate"]["value"], 10) == 0.4


def test_funnel_analytics_without_data_is_not_applicable_never_zero(client):
    org_id = _register_login_and_create_org(client, "funan2@example.com", "Empresa FunAn 2")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 200
    body = resp.json()
    for stage in body["stages"].values():
        assert stage["is_applicable"] is False
        assert stage["value"] is None
    for conversion in body["conversions"]:
        assert conversion["conversion_rate"]["is_applicable"] is False


def test_funnel_analytics_compares_conversion_rate_to_previous_period(client):
    org_id = _register_login_and_create_org(client, "funan3@example.com", "Empresa FunAn 3")
    _upsert_snapshot(client, org_id, period="2026-05-01", leads=100, mqls=20)  # 20%
    _upsert_snapshot(client, org_id, period="2026-06-01", leads=100, mqls=40)  # 40%

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    body = resp.json()
    leads_to_mqls = next(c for c in body["conversions"] if c["from_stage"] == "leads" and c["to_stage"] == "mqls")
    comparison = leads_to_mqls["conversion_rate_comparison"]
    assert comparison["baseline_value"] == 0.2
    assert comparison["current_value"] == 0.4


def test_funnel_analytics_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "funan4@example.com", "Empresa FunAn 4")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_funnel_analytics_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "funan5a@example.com", "Empresa FunAn 5A")
    _register_login_and_create_org(client_b, "funan5b@example.com", "Empresa FunAn 5B")

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/funnel",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404


def test_upsert_channel_snapshot_does_not_collide_with_aggregate_row(client):
    org_id = _register_login_and_create_org(client, "funan6@example.com", "Empresa FunAn 6")
    channel_id = _create_channel(client, org_id)

    _upsert_snapshot(client, org_id, period="2026-06-01", leads=500)  # agregada
    _upsert_snapshot(client, org_id, period="2026-06-01", channel_id=channel_id, leads=200)  # por canal

    # A tela de entrada manual (GET /funnel-snapshots) so ve a agregada.
    snapshots = client.get(f"/api/v1/organizations/{org_id}/funnel-snapshots").json()
    matching = [s for s in snapshots if s["period"] == "2026-06-01"]
    assert len(matching) == 1
    assert matching[0]["leads"] == 500
    assert matching[0]["channel_id"] is None


def test_upsert_second_aggregate_row_same_period_updates_not_duplicates(client):
    # A upsert de uma linha por canal nao pode fazer a linha agregada
    # existente sumir nem duplicar — prova o indice parcial
    # (WHERE channel_id IS NULL) via comportamento observavel da API.
    org_id = _register_login_and_create_org(client, "funan7@example.com", "Empresa FunAn 7")
    _upsert_snapshot(client, org_id, period="2026-06-01", leads=100)
    _upsert_snapshot(client, org_id, period="2026-06-01", leads=150)

    snapshots = client.get(f"/api/v1/organizations/{org_id}/funnel-snapshots").json()
    matching = [s for s in snapshots if s["period"] == "2026-06-01"]
    assert len(matching) == 1
    assert matching[0]["leads"] == 150
