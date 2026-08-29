"""Modulo de importacao — RNF-002 (isolamento multi-tenant) e validacao de
arquivo em profundidade contra upload malicioso (secao 17-18 do prompt
mestre): MIME/extensao incompatível, arquivo maior que o limite, JSON
malformado/aninhado demais, acesso cross-tenant a job de outra organizacao
e RBAC (VIEWER nao pode importar).
"""

from pathlib import Path

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "imports"


def _register_and_login(client, name: str, email: str, password: str = "SenhaForte123!") -> None:
    client.post("/api/v1/auth/register", json={"name": name, "email": email, "password": password})
    client.post("/api/v1/auth/login", json={"email": email, "password": password})


def _upload(
    client, org_id: str, filename: str, content: bytes, content_type: str, domain: str = "financial_periods"
):
    return client.post(
        f"/api/v1/organizations/{org_id}/imports",
        data={"domain": domain},
        files={"file": (filename, content, content_type)},
    )


def test_oversized_file_is_rejected(client):
    _register_and_login(client, "Ana", "sec.oversized@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Sec Oversized"}).json()["id"]

    huge_content = b"Periodo,Receita\n" + b"2026-01-01,1000\n" * 400_000  # bem acima de 5 MB
    resp = _upload(client, org_id, "grande.csv", huge_content, "text/csv")
    assert resp.status_code == 400


def test_malformed_json_is_rejected(client):
    _register_and_login(client, "Ana", "sec.badjson@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Sec BadJson"}).json()["id"]

    resp = _upload(client, org_id, "quebrado.json", b"{isto nao fecha", "application/json")
    assert resp.status_code == 400


def test_deeply_nested_json_is_rejected(client):
    _register_and_login(client, "Ana", "sec.nested@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Sec Nested"}).json()["id"]

    nested = b'[{"a": {"b": {"c": {"d": {"e": 1}}}}}]'
    resp = _upload(client, org_id, "aninhado.json", nested, "application/json")
    assert resp.status_code == 400


def test_fake_xlsx_without_zip_signature_is_rejected(client):
    _register_and_login(client, "Ana", "sec.fakexlsx@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Sec Fake Xlsx"}).json()["id"]

    resp = _upload(
        client,
        org_id,
        "renomeado.xlsx",
        b"na verdade isto e so texto puro, nao um zip/xlsx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    assert resp.status_code == 400


def test_unsupported_file_extension_is_rejected(client):
    _register_and_login(client, "Ana", "sec.badext@example.com")
    org_id = client.post("/api/v1/organizations", json={"name": "Empresa Sec BadExt"}).json()["id"]

    resp = _upload(client, org_id, "script.exe", b"MZ\x90\x00", "application/octet-stream")
    assert resp.status_code == 400


def test_user_cannot_read_import_job_of_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_and_login(client_a, "Ana", "sec.crossa@example.com")
    _register_and_login(client_b, "Bruno", "sec.crossb@example.com")

    org_a = client_a.post("/api/v1/organizations", json={"name": "Empresa Cross A"}).json()["id"]
    org_b = client_b.post("/api/v1/organizations", json={"name": "Empresa Cross B"}).json()["id"]

    content = FIXTURES.joinpath("valid.csv").read_bytes()
    create = _upload(client_a, org_a, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]

    # Organização B tenta ler o job da organização A usando o proprio path
    # (org_b) — deve dar 404, nunca vazar o job de outra organizacao.
    resp = client_b.get(f"/api/v1/organizations/{org_b}/imports/{job_id}")
    assert resp.status_code == 404


def test_user_cannot_confirm_import_job_of_another_organization(client_factory):
    client_a = client_factory()
    client_b = client_factory()
    _register_and_login(client_a, "Ana", "sec.crossconfirm.a@example.com")
    _register_and_login(client_b, "Bruno", "sec.crossconfirm.b@example.com")

    org_a = client_a.post("/api/v1/organizations", json={"name": "Empresa Cross Confirm A"}).json()["id"]
    org_b = client_b.post("/api/v1/organizations", json={"name": "Empresa Cross Confirm B"}).json()["id"]

    content = FIXTURES.joinpath("valid.csv").read_bytes()
    create = _upload(client_a, org_a, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]

    resp = client_b.post(
        f"/api/v1/organizations/{org_b}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    )
    assert resp.status_code == 404


def test_viewer_cannot_upload_import(client_factory):
    owner = client_factory()
    viewer_client = client_factory()
    _register_and_login(owner, "Ana", "sec.viewerowner@example.com")
    _register_and_login(viewer_client, "Vitor", "sec.viewer@example.com")

    org_id = owner.post("/api/v1/organizations", json={"name": "Empresa Sec Viewer"}).json()["id"]
    owner.post(
        f"/api/v1/organizations/{org_id}/memberships",
        json={"email": "sec.viewer@example.com", "role": "VIEWER"},
    )

    content = FIXTURES.joinpath("valid.csv").read_bytes()
    resp = _upload(viewer_client, org_id, "valid.csv", content, "text/csv")
    assert resp.status_code == 403


def test_unauthenticated_upload_is_rejected(client_factory):
    client = client_factory()
    resp = client.post(
        f"/api/v1/organizations/{'00000000-0000-0000-0000-000000000000'}/imports",
        data={"domain": "financial_periods"},
        files={"file": ("valid.csv", b"a,b\n1,2\n", "text/csv")},
    )
    assert resp.status_code == 401
