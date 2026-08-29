"""app/modules/imports/mapping.py e puro — sugestao automatica de campo
por alias exato, fuzzy match (difflib) e mapeamento lembrado da organizacao."""

from app.modules.imports.domains import FINANCIAL_PERIODS, FUNNEL_SNAPSHOTS
from app.modules.imports.mapping import normalize_header, suggest_mapping


class TestNormalizeHeader:
    def test_lowercases_and_strips_accents(self):
        assert normalize_header("Período") == "periodo"

    def test_collapses_underscore_and_dash_to_space(self):
        assert normalize_header("data_pedido") == "data pedido"
        assert normalize_header("DATA-PEDIDO") == "data pedido"

    def test_strips_punctuation(self):
        assert normalize_header("Receita (R$)") == "receita r"

    def test_collapses_multiple_spaces(self):
        assert normalize_header("  Data   Pedido  ") == "data pedido"


class TestSuggestMapping:
    def test_exact_canonical_name_is_high_confidence(self):
        suggestions = suggest_mapping(["period"], FINANCIAL_PERIODS)
        assert suggestions[0].canonical_field == "period"
        assert suggestions[0].confidence == "alta"

    def test_known_alias_is_high_confidence(self):
        suggestions = suggest_mapping(["Faturamento"], FINANCIAL_PERIODS)
        assert suggestions[0].canonical_field == "revenue"
        assert suggestions[0].confidence == "alta"

    def test_close_typo_is_medium_or_high_confidence(self):
        # "Receit" (falta 1 letra de um alias real) ainda deve mapear certo.
        suggestions = suggest_mapping(["Receit"], FINANCIAL_PERIODS)
        assert suggestions[0].canonical_field == "revenue"
        assert suggestions[0].confidence in ("alta", "media")

    def test_unrelated_header_has_no_match(self):
        suggestions = suggest_mapping(["Cor Favorita do Cliente"], FINANCIAL_PERIODS)
        assert suggestions[0].canonical_field is None
        assert suggestions[0].confidence == "sem_correspondencia"

    def test_remembered_mapping_wins_over_fuzzy_match(self):
        # "Coluna Estranha" nao bate com nenhum alias, mas a organizacao ja
        # mapeou esse cabecalho para "costs" num import anterior.
        remembered = {normalize_header("Coluna Estranha"): "costs"}
        suggestions = suggest_mapping(["Coluna Estranha"], FINANCIAL_PERIODS, remembered)
        assert suggestions[0].canonical_field == "costs"
        assert suggestions[0].confidence == "alta"

    def test_remembered_mapping_with_unknown_field_is_ignored(self):
        remembered = {normalize_header("Coluna X"): "campo_que_nao_existe_mais"}
        suggestions = suggest_mapping(["Coluna X"], FINANCIAL_PERIODS, remembered)
        assert suggestions[0].canonical_field != "campo_que_nao_existe_mais"

    def test_preserves_header_order_and_original_text(self):
        headers = ["Faturamento", "Custo Total", "Período"]
        suggestions = suggest_mapping(headers, FINANCIAL_PERIODS)
        assert [s.header for s in suggestions] == headers

    def test_maps_funnel_headers_by_alias(self):
        suggestions = suggest_mapping(["Impressões", "Leads", "MQLs"], FUNNEL_SNAPSHOTS)
        assert [s.canonical_field for s in suggestions] == ["impressions", "leads", "mqls"]
        assert all(s.confidence == "alta" for s in suggestions)
