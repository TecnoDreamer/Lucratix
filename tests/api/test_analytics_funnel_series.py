"""Série mensal do funil agregado (/analytics/funnel/series)."""


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _upsert_snapshot(client, org_id: str, **payload) -> dict:
    resp = client.put(f"/api/v1/organizations/{org_id}/funnel-snapshots", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_funnel_series_has_one_point_per_month_with_own_data(client):
    org_id = _register_login_and_create_org(client, "funseries1@example.com", "Empresa FunSeries 1")

    _upsert_snapshot(client, org_id, period="2026-06-01", leads=100)
    _upsert_snapshot(client, org_id, period="2026-08-01", leads=150)

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel/series",
        params={"date_from": "2026-06-01", "date_to": "2026-08-31"},
    )
    assert resp.status_code == 200
    body = resp.json()

    assert [p["period"] for p in body["points"]] == ["2026-06-01", "2026-07-01", "2026-08-01"]
    assert body["points"][0]["stages"]["leads"]["value"] == 100
    # Julho nao tem snapshot: aparece no meio da lista (nunca omitido), mas
    # nao aplicavel — nunca vira 0 (RN-003).
    assert body["points"][1]["stages"]["leads"]["is_applicable"] is False
    assert body["points"][1]["stages"]["leads"]["value"] is None
    assert body["points"][2]["stages"]["leads"]["value"] == 150


def test_funnel_series_rejects_inverted_range(client):
    org_id = _register_login_and_create_org(client, "funseries2@example.com", "Empresa FunSeries 2")

    resp = client.get(
        f"/api/v1/organizations/{org_id}/analytics/funnel/series",
        params={"date_from": "2026-08-31", "date_to": "2026-08-01"},
    )
    assert resp.status_code == 400


def test_funnel_series_isolates_organizations(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    org_a = _register_login_and_create_org(client_a, "funseries3a@example.com", "Empresa FunSeries 3A")
    _register_login_and_create_org(client_b, "funseries3b@example.com", "Empresa FunSeries 3B")

    _upsert_snapshot(client_a, org_a, period="2026-06-01", leads=100)

    resp = client_b.get(
        f"/api/v1/organizations/{org_a}/analytics/funnel/series",
        params={"date_from": "2026-06-01", "date_to": "2026-06-30"},
    )
    assert resp.status_code == 404
