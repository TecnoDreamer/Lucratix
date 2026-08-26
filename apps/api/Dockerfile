FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
ARG INSTALL_DEV=false
RUN if [ "$INSTALL_DEV" = "true" ]; then \
      pip install --no-cache-dir -e ".[dev]"; \
    else \
      pip install --no-cache-dir -e .; \
    fi

COPY . .

EXPOSE 8000

# $PORT: plataformas como Railway/Render injetam essa variavel e esperam que
# o processo escute nela; 8000 e o fallback para docker-compose local.
# --reload so em desenvolvimento (ENV=development, como no docker-compose.yml
# local) — nunca em producao, onde so aumenta uso de recursos sem beneficio.
#
# `alembic upgrade head` roda sempre, antes do servidor subir: antes disso,
# migrations em producao dependiam de alguem lembrar de rodar `npm run
# migrate` manualmente apos o deploy — a migration 0007 (tabela `sessions`)
# ficou pendente em producao dessa forma e todo login passou a falhar com
# 500 (INSERT numa tabela inexistente). Idempotente (no-op se ja estiver em
# head), entao rodar em todo start, dev ou producao, e seguro.
CMD ["sh", "-c", "alembic upgrade head && if [ \"$ENV\" = \"development\" ]; then exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --reload; else exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}; fi"]
