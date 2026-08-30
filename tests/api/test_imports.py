"""Modulo de importacao de dados — corte vertical, domínio Financeiro
(2026-08-29). Fluxo completo: upload -> mapeamento -> preview -> confirmacao
-> banco, alem de reprocessamento (skip/update) e historico/erros/templates.
"""

from pathlib import Path

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures" / "imports"


def _register_login_and_create_org(client, email: str, org_name: str) -> str:
    client.post(
        "/api/v1/auth/register",
        json={"name": "Ana", "email": email, "password": "SenhaForte123!"},
    )
    client.post("/api/v1/auth/login", json={"email": email, "password": "SenhaForte123!"})
    org = client.post("/api/v1/organizations", json={"name": org_name}).json()
    return org["id"]


def _upload(
    client, org_id: str, filename: str, content: bytes, content_type: str, domain: str = "financial_periods"
):
    return client.post(
        f"/api/v1/organizations/{org_id}/imports",
        data={"domain": domain},
        files={"file": (filename, content, content_type)},
    )


def _suggested_mapping_dict(create_resp_json: dict) -> dict[str, str]:
    return {
        s["header"]: s["canonical_field"]
        for s in create_resp_json["suggested_mapping"]
        if s["canonical_field"]
    }


def test_list_domains_returns_financial_periods_with_required_field(client):
    org_id = _register_login_and_create_org(client, "imp.domains@example.com", "Empresa Imp Domains")
    resp = client.get(f"/api/v1/organizations/{org_id}/imports/domains")
    assert resp.status_code == 200
    body = resp.json()
    assert "financial_periods" in body
    fields = {f["canonical_name"]: f for f in body["financial_periods"]}
    assert fields["period"]["required"] is True
    assert fields["revenue"]["required"] is False


def test_list_domains_includes_funnel_snapshots(client):
    org_id = _register_login_and_create_org(
        client, "imp.domainsfunnel@example.com", "Empresa Imp Domains Funil"
    )
    resp = client.get(f"/api/v1/organizations/{org_id}/imports/domains")
    body = resp.json()
    assert "funnel_snapshots" in body
    fields = {f["canonical_name"]: f for f in body["funnel_snapshots"]}
    assert fields["period"]["required"] is True
    assert fields["leads"]["data_type"] == "integer"


def test_upload_suggests_high_confidence_mapping_for_known_headers(client):
    org_id = _register_login_and_create_org(client, "imp.suggest@example.com", "Empresa Imp Suggest")
    content = FIXTURES.joinpath("valid.csv").read_bytes()

    resp = _upload(client, org_id, "valid.csv", content, "text/csv")
    assert resp.status_code == 201
    body = resp.json()
    assert body["job"]["status"] == "MAPPING_REQUIRED"
    assert body["job"]["total_rows"] == 2

    mapping = _suggested_mapping_dict(body)
    assert mapping["Periodo"] == "period"
    assert mapping["Receita"] == "revenue"
    assert mapping["Custos"] == "costs"
    assert mapping["Despesas"] == "expenses"


def test_full_flow_upload_mapping_preview_confirm_creates_financial_periods(client):
    org_id = _register_login_and_create_org(client, "imp.fullflow@example.com", "Empresa Imp Full Flow")
    content = FIXTURES.joinpath("valid.csv").read_bytes()

    create = _upload(client, org_id, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {"date_format": "DMY"}},
    )
    assert mapping_resp.status_code == 200
    summary = mapping_resp.json()
    assert summary["status"] == "READY"
    assert summary["valid"] == 2
    assert summary["invalid"] == 0
    assert summary["duplicate"] == 0

    preview = client.get(f"/api/v1/organizations/{org_id}/imports/{job_id}/preview")
    assert preview.status_code == 200
    preview_body = preview.json()
    assert preview_body["total"] == 2
    assert preview_body["items"][0]["status"] == "valid"
    assert preview_body["items"][0]["transformed"]["revenue"] == 10000.0

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    )
    assert confirm.status_code == 200
    confirm_body = confirm.json()
    assert confirm_body["status"] == "COMPLETED"
    assert confirm_body["created_rows"] == 2
    assert confirm_body["updated_rows"] == 0
    assert confirm_body["skipped_rows"] == 0

    financials = client.get(f"/api/v1/organizations/{org_id}/financials").json()
    periods = {p["period"]: p for p in financials}
    assert periods["2026-01-01"]["revenue"] == 10000
    assert periods["2026-01-01"]["costs"] == 3000
    assert periods["2026-02-01"]["revenue"] == 12000


def test_reimporting_same_file_skips_duplicates_by_default(client):
    org_id = _register_login_and_create_org(client, "imp.reimport@example.com", "Empresa Imp Reimport")
    content = FIXTURES.joinpath("valid.csv").read_bytes()

    def _run_full_import(duplicate_strategy: str) -> dict:
        create = _upload(client, org_id, "valid.csv", content, "text/csv")
        job_id = create.json()["job"]["id"]
        mapping = _suggested_mapping_dict(create.json())
        client.put(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
            json={"mapping": mapping, "transform_config": {}},
        )
        return client.post(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm",
            json={"duplicate_strategy": duplicate_strategy},
        ).json()

    first = _run_full_import("skip")
    assert first["created_rows"] == 2

    second = _run_full_import("skip")
    assert second["created_rows"] == 0
    assert second["skipped_rows"] == 2
    assert second["status"] == "COMPLETED"

    financials = client.get(f"/api/v1/organizations/{org_id}/financials").json()
    matching = [p for p in financials if p["period"] == "2026-01-01"]
    assert len(matching) == 1
    assert matching[0]["revenue"] == 10000  # nao duplicou nem sobrescreveu


def test_reimporting_with_update_strategy_overwrites_existing_period(client):
    org_id = _register_login_and_create_org(client, "imp.update@example.com", "Empresa Imp Update")
    content = FIXTURES.joinpath("valid.csv").read_bytes()
    updated_content = (
        b"Periodo,Receita,Custos,Despesas\n2026-01-01,99999,3000,1000\n2026-02-01,12000,3500,1200\n"
    )

    def _run_full_import(payload: bytes, duplicate_strategy: str) -> dict:
        create = _upload(client, org_id, "valid.csv", payload, "text/csv")
        job_id = create.json()["job"]["id"]
        mapping = _suggested_mapping_dict(create.json())
        client.put(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
            json={"mapping": mapping, "transform_config": {}},
        )
        return client.post(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm",
            json={"duplicate_strategy": duplicate_strategy},
        ).json()

    _run_full_import(content, "skip")
    second = _run_full_import(updated_content, "update")
    assert second["updated_rows"] == 2
    assert second["created_rows"] == 0

    financials = client.get(f"/api/v1/organizations/{org_id}/financials").json()
    matching = [p for p in financials if p["period"] == "2026-01-01"]
    assert matching[0]["revenue"] == 99999


def test_invalid_rows_are_reported_in_preview_and_errors_endpoint(client):
    org_id = _register_login_and_create_org(client, "imp.invalid@example.com", "Empresa Imp Invalid")
    content = FIXTURES.joinpath("invalid.csv").read_bytes()

    create = _upload(client, org_id, "invalid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]
    mapping = {"Periodo": "period", "Receita": "revenue"}

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    summary = mapping_resp.json()
    assert summary["invalid"] == 3

    errors = client.get(f"/api/v1/organizations/{org_id}/imports/{job_id}/errors")
    assert errors.status_code == 200
    assert errors.json()["total"] >= 3


def test_confirm_before_ready_is_rejected(client):
    org_id = _register_login_and_create_org(client, "imp.notready@example.com", "Empresa Imp Not Ready")
    content = FIXTURES.joinpath("valid.csv").read_bytes()
    create = _upload(client, org_id, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]

    # Sem mapear (nenhum campo obrigatorio mapeado) o job continua
    # MAPPING_REQUIRED, nunca chega em READY.
    resp = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    )
    assert resp.status_code == 400


def test_unsupported_domain_is_rejected(client):
    org_id = _register_login_and_create_org(client, "imp.baddomain@example.com", "Empresa Imp Bad Domain")
    resp = _upload(client, org_id, "valid.csv", b"a,b\n1,2\n", "text/csv", domain="leads")
    assert resp.status_code == 400


def test_cancel_import_marks_job_cancelled(client):
    org_id = _register_login_and_create_org(client, "imp.cancel@example.com", "Empresa Imp Cancel")
    content = FIXTURES.joinpath("valid.csv").read_bytes()
    create = _upload(client, org_id, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]

    resp = client.delete(f"/api/v1/organizations/{org_id}/imports/{job_id}")
    assert resp.status_code == 204

    job = client.get(f"/api/v1/organizations/{org_id}/imports/{job_id}").json()
    assert job["status"] == "CANCELLED"


def test_cancel_already_completed_import_is_rejected(client):
    org_id = _register_login_and_create_org(client, "imp.cancelcompleted@example.com", "Empresa Imp Cancel2")
    content = FIXTURES.joinpath("valid.csv").read_bytes()
    create = _upload(client, org_id, "valid.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    )

    resp = client.delete(f"/api/v1/organizations/{org_id}/imports/{job_id}")
    assert resp.status_code == 400


def test_import_history_lists_jobs_paginated(client):
    org_id = _register_login_and_create_org(client, "imp.history@example.com", "Empresa Imp History")
    content = FIXTURES.joinpath("valid.csv").read_bytes()
    for _ in range(3):
        _upload(client, org_id, "valid.csv", content, "text/csv")

    resp = client.get(f"/api/v1/organizations/{org_id}/imports", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 3
    assert len(body["items"]) == 2


def test_mapping_template_create_and_list(client):
    org_id = _register_login_and_create_org(client, "imp.templates@example.com", "Empresa Imp Templates")
    create = client.post(
        f"/api/v1/organizations/{org_id}/imports/mapping-templates",
        json={
            "domain": "financial_periods",
            "name": "Padrão ERP",
            "mapping": {"Data Ref": "period", "Fat.": "revenue"},
        },
    )
    assert create.status_code == 201

    listed = client.get(
        f"/api/v1/organizations/{org_id}/imports/mapping-templates", params={"domain": "financial_periods"}
    )
    assert listed.status_code == 200
    names = [t["name"] for t in listed.json()]
    assert "Padrão ERP" in names


def test_xlsx_upload_with_alias_headers_maps_correctly(client):
    org_id = _register_login_and_create_org(client, "imp.xlsx@example.com", "Empresa Imp Xlsx")
    content = FIXTURES.joinpath("aliases.xlsx").read_bytes()

    resp = _upload(
        client,
        org_id,
        "aliases.xlsx",
        content,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    assert resp.status_code == 201
    mapping = _suggested_mapping_dict(resp.json())
    assert mapping["Data de Referência"] == "period"
    assert mapping["Faturamento"] == "revenue"
    assert mapping["Custo Total"] == "costs"
    assert mapping["Investimento Marketing"] == "marketing_investment"


def test_json_upload_full_flow(client):
    org_id = _register_login_and_create_org(client, "imp.json@example.com", "Empresa Imp Json")
    content = FIXTURES.joinpath("valid.json").read_bytes()

    create = _upload(client, org_id, "valid.json", content, "application/json")
    assert create.status_code == 201
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())

    client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 2


def test_duplicates_within_same_file_are_flagged_and_only_first_row_written(client):
    org_id = _register_login_and_create_org(client, "imp.dupfile@example.com", "Empresa Imp Dup File")
    content = FIXTURES.joinpath("duplicates.csv").read_bytes()

    create = _upload(client, org_id, "duplicates.csv", content, "text/csv")
    job_id = create.json()["job"]["id"]
    mapping = {"Periodo": "period", "Receita": "revenue"}
    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["duplicate"] == 1

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 1
    assert confirm["skipped_rows"] == 1


def test_funnel_snapshots_full_flow_creates_records_with_integer_fields(client):
    """Prova que a extensao para um segundo dominio (Funil) funciona ponta a
    ponta pelo mesmo pipeline generico — nenhum codigo novo no router/service/
    validation, so DomainSpec + writer/reader (ver domains.py/writers.py)."""
    org_id = _register_login_and_create_org(client, "imp.funnel@example.com", "Empresa Imp Funil")
    content = b"Periodo,Impressoes,Visitas,Leads\n2026-01-01,10000,2000,150\n2026-02-01,12000,2500,180\n"

    create = _upload(client, org_id, "funil.csv", content, "text/csv", domain="funnel_snapshots")
    assert create.status_code == 201
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    assert mapping == {
        "Periodo": "period",
        "Impressoes": "impressions",
        "Visitas": "visits",
        "Leads": "leads",
    }

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["status"] == "READY"

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 2

    snapshots = client.get(f"/api/v1/organizations/{org_id}/funnel-snapshots").json()
    by_period = {s["period"]: s for s in snapshots}
    assert by_period["2026-01-01"]["impressions"] == 10000
    assert by_period["2026-01-01"]["visits"] == 2000
    assert by_period["2026-01-01"]["leads"] == 150


def test_funnel_snapshot_with_fractional_count_is_invalid(client):
    org_id = _register_login_and_create_org(client, "imp.funnelbad@example.com", "Empresa Imp Funil Bad")
    content = b"Periodo,Leads\n2026-01-01,10.5\n"

    create = _upload(client, org_id, "funil.csv", content, "text/csv", domain="funnel_snapshots")
    job_id = create.json()["job"]["id"]
    mapping = {"Periodo": "period", "Leads": "leads"}

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["invalid"] == 1


def test_list_domains_includes_products(client):
    org_id = _register_login_and_create_org(
        client, "imp.domainsproducts@example.com", "Empresa Imp Domains Produtos"
    )
    resp = client.get(f"/api/v1/organizations/{org_id}/imports/domains")
    body = resp.json()
    assert "products" in body
    fields = {f["canonical_name"]: f for f in body["products"]}
    assert fields["name"]["required"] is True
    assert fields["active"]["data_type"] == "boolean"


def test_products_full_flow_creates_records(client):
    """Segundo domínio sem chave natural única no banco (name não tem
    constraint de unicidade, ao contrário de period em Financeiro/Funil) —
    prova que a deduplicação por nome (normalize_natural_key_value) funciona
    ponta a ponta, não só na validação isolada."""
    org_id = _register_login_and_create_org(client, "imp.products@example.com", "Empresa Imp Produtos")
    content = (
        b"Nome,Categoria,Preco,Custo,Ativo\n"
        b"Notebook Pro,Eletronicos,5000,3000,true\n"
        b"Mouse Sem Fio,Eletronicos,80,40,true\n"
    )

    create = _upload(client, org_id, "produtos.csv", content, "text/csv", domain="products")
    assert create.status_code == 201
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    assert mapping["Nome"] == "name"
    assert mapping["Ativo"] == "active"

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["status"] == "READY"

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 2

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    by_name = {p["name"]: p for p in products}
    assert by_name["Notebook Pro"]["price"] == 5000
    assert by_name["Notebook Pro"]["cost"] == 3000
    assert by_name["Notebook Pro"]["active"] is True


def test_products_reimport_with_different_case_updates_existing(client):
    org_id = _register_login_and_create_org(
        client, "imp.productscase@example.com", "Empresa Imp Produtos Case"
    )

    def _import(content: bytes, duplicate_strategy: str) -> dict:
        create = _upload(client, org_id, "produtos.csv", content, "text/csv", domain="products")
        job_id = create.json()["job"]["id"]
        mapping = _suggested_mapping_dict(create.json())
        client.put(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
            json={"mapping": mapping, "transform_config": {}},
        )
        return client.post(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm",
            json={"duplicate_strategy": duplicate_strategy},
        ).json()

    first = _import(b"Nome,Preco\nNotebook Pro,5000\n", "skip")
    assert first["created_rows"] == 1

    # Mesmo produto, nome com capitalização diferente — precisa ser
    # reconhecido como o mesmo (name não tem constraint de unicidade no
    # banco; a deduplicação é só na camada de importação).
    second = _import(b"Nome,Preco\nNOTEBOOK PRO,5500\n", "update")
    assert second["updated_rows"] == 1
    assert second["created_rows"] == 0

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    assert len(products) == 1
    assert products[0]["price"] == 5500


def test_product_without_active_mapped_defaults_to_active_true(client):
    org_id = _register_login_and_create_org(
        client, "imp.productdefault@example.com", "Empresa Imp Produtos Default"
    )
    content = b"Nome\nProduto Simples\n"

    create = _upload(client, org_id, "produtos.csv", content, "text/csv", domain="products")
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 1

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    assert products[0]["active"] is True


def test_product_update_without_active_mapped_keeps_existing_value(client):
    org_id = _register_login_and_create_org(
        client, "imp.productkeep@example.com", "Empresa Imp Produtos Keep"
    )

    # Cria o produto já inativo, direto pela API de produtos (fora do fluxo
    # de import).
    created = client.post(
        f"/api/v1/organizations/{org_id}/products", json={"name": "Produto Antigo"}
    ).json()
    client.patch(f"/api/v1/organizations/{org_id}/products/{created['id']}", json={"active": False})

    # Reimporta o mesmo produto (por nome) sem mapear "Ativo" — não pode
    # reativar por acidente.
    content = b"Nome,Preco\nProduto Antigo,999\n"
    create = _upload(client, org_id, "produtos.csv", content, "text/csv", domain="products")
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "update"}
    ).json()
    assert confirm["updated_rows"] == 1

    products = client.get(f"/api/v1/organizations/{org_id}/products").json()
    assert products[0]["active"] is False
    assert products[0]["price"] == 999


def test_list_domains_includes_campaigns(client):
    org_id = _register_login_and_create_org(
        client, "imp.domainscampaigns@example.com", "Empresa Imp Domains Campanhas"
    )
    resp = client.get(f"/api/v1/organizations/{org_id}/imports/domains")
    body = resp.json()
    assert "campaigns" in body
    fields = {f["canonical_name"]: f for f in body["campaigns"]}
    assert fields["channel"]["required"] is True
    assert fields["name"]["required"] is True
    assert fields["investment"]["data_type"] == "decimal"


def test_campaigns_full_flow_resolves_channel_by_name(client):
    """O canal precisa já existir — nunca é criado automaticamente a partir
    do nome escrito no arquivo (decisão confirmada com o usuário)."""
    org_id = _register_login_and_create_org(client, "imp.campaigns@example.com", "Empresa Imp Campanhas")
    client.post(f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Google Ads"})

    content = b"Canal,Nome,Investimento,Cliques\nGoogle Ads,Black Friday,5000,1200\n"
    create = _upload(client, org_id, "campanhas.csv", content, "text/csv", domain="campaigns")
    assert create.status_code == 201
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    assert mapping["Canal"] == "channel"
    assert mapping["Nome"] == "name"

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["status"] == "READY"
    assert mapping_resp.json()["invalid"] == 0

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 1

    campaigns = client.get(f"/api/v1/organizations/{org_id}/campaigns").json()
    assert campaigns[0]["name"] == "Black Friday"
    assert campaigns[0]["investment"] == 5000
    assert campaigns[0]["clicks"] == 1200


def test_campaign_with_unknown_channel_is_invalid(client):
    org_id = _register_login_and_create_org(
        client, "imp.campaignbadchannel@example.com", "Empresa Imp Campanhas Canal"
    )
    # Nenhum canal cadastrado nesta organização.
    content = b"Canal,Nome\nGoogle Ads,Black Friday\n"
    create = _upload(client, org_id, "campanhas.csv", content, "text/csv", domain="campaigns")
    job_id = create.json()["job"]["id"]
    mapping = {"Canal": "channel", "Nome": "name"}

    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    summary = mapping_resp.json()
    assert summary["invalid"] == 1
    # Confirma que o canal realmente não foi criado por adivinhação.
    assert client.get(f"/api/v1/organizations/{org_id}/marketing-channels").json() == []


def test_campaigns_reimport_with_different_case_updates_existing(client):
    org_id = _register_login_and_create_org(
        client, "imp.campaignscase@example.com", "Empresa Imp Campanhas Case"
    )
    client.post(f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Google Ads"})

    def _import(content: bytes, duplicate_strategy: str) -> dict:
        create = _upload(client, org_id, "campanhas.csv", content, "text/csv", domain="campaigns")
        job_id = create.json()["job"]["id"]
        mapping = _suggested_mapping_dict(create.json())
        client.put(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
            json={"mapping": mapping, "transform_config": {}},
        )
        return client.post(
            f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm",
            json={"duplicate_strategy": duplicate_strategy},
        ).json()

    first = _import(b"Canal,Nome,Investimento\nGoogle Ads,Black Friday,5000\n", "skip")
    assert first["created_rows"] == 1

    # Mesma campanha, canal e nome com capitalização diferente — precisa
    # ser reconhecida como a mesma (nem "name" nem "channel" tem constraint
    # de unicidade no banco).
    second = _import(b"Canal,Nome,Investimento\nGOOGLE ADS,black friday,5500\n", "update")
    assert second["updated_rows"] == 1
    assert second["created_rows"] == 0

    campaigns = client.get(f"/api/v1/organizations/{org_id}/campaigns").json()
    assert len(campaigns) == 1
    assert campaigns[0]["investment"] == 5500


def test_same_campaign_name_in_different_channels_is_not_a_duplicate(client):
    org_id = _register_login_and_create_org(
        client, "imp.campaignsmultichannel@example.com", "Empresa Imp Campanhas Multi Canal"
    )
    client.post(f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Google Ads"})
    client.post(f"/api/v1/organizations/{org_id}/marketing-channels", json={"name": "Instagram"})

    content = b"Canal,Nome\nGoogle Ads,Black Friday\nInstagram,Black Friday\n"
    create = _upload(client, org_id, "campanhas.csv", content, "text/csv", domain="campaigns")
    job_id = create.json()["job"]["id"]
    mapping = _suggested_mapping_dict(create.json())
    mapping_resp = client.put(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/mapping",
        json={"mapping": mapping, "transform_config": {}},
    )
    assert mapping_resp.json()["duplicate"] == 0

    confirm = client.post(
        f"/api/v1/organizations/{org_id}/imports/{job_id}/confirm", json={"duplicate_strategy": "skip"}
    ).json()
    assert confirm["created_rows"] == 2
