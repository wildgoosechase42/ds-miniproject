FROM python:3.11-slim

WORKDIR /app

# Install GCC and build utilities to compile C core
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/

# Compile C mission suite shared library
RUN gcc -shared -o ./backend/c_core/libmissionsuite.so -fPIC ./backend/c_core/mission_suite.c

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
