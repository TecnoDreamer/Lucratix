"""app/modules/imports/domains.py::normalize_natural_key_value — a única
lógica não-declarativa deste módulo (o resto é registro de dados)."""

from datetime import date

from app.modules.imports.domains import DOMAIN_REGISTRY, PRODUCTS, normalize_natural_key_value


class TestNormalizeNaturalKeyValue:
    def test_lowercases_and_strips_string(self):
        assert normalize_natural_key_value("  Produto A  ") == "produto a"

    def test_case_and_whitespace_variants_are_equal(self):
        assert normalize_natural_key_value("Notebook Pro") == normalize_natural_key_value(
            "  notebook pro  "
        )

    def test_non_string_passes_through_unchanged(self):
        d = date(2026, 1, 1)
        assert normalize_natural_key_value(d) is d
        assert normalize_natural_key_value(None) is None


class TestDomainRegistry:
    def test_products_is_registered(self):
        assert DOMAIN_REGISTRY["products"] is PRODUCTS

    def test_products_natural_key_is_name(self):
        assert PRODUCTS.natural_key == ("name",)

    def test_products_does_not_support_date_range(self):
        assert PRODUCTS.supports_date_range is False

    def test_financial_and_funnel_support_date_range_by_default(self):
        assert DOMAIN_REGISTRY["financial_periods"].supports_date_range is True
        assert DOMAIN_REGISTRY["funnel_snapshots"].supports_date_range is True

    def test_only_name_is_required_in_products(self):
        required = {f.canonical_name for f in PRODUCTS.fields if f.required}
        assert required == {"name"}
