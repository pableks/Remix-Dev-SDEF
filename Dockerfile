# Multi-stage build para optimizar caché y tamaño
FROM node:20-slim AS base
WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Instalar dependencias del sistema necesarias
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Stage para instalar dependencias
FROM base AS deps
# Copiar archivos de dependencias primero (para cache)
COPY package.json pnpm-lock.yaml ./
# Instalar dependencias con pnpm y cachear node_modules
RUN pnpm install --frozen-lockfile

# Stage para build
FROM base AS builder
# Copiar node_modules desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules
# Copiar código fuente
COPY . .
# Construir la aplicación
RUN pnpm run build

# Stage de producción
FROM node:20-slim AS production
WORKDIR /app

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 remix

# Copiar solo las dependencias de producción
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copiar build desde la etapa builder
COPY --from=builder --chown=remix:nodejs /app/build ./build
COPY --from=builder --chown=remix:nodejs /app/public ./public

# Cambiar al usuario remix
USER remix

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000
ENV DOMAIN=http://52.170.190.53/
ENV BACKEND_URL=http://172.203.150.174:8000
ENV SESSION_SECRET=tu-session-secret-muy-seguro-cambia-esto-en-produccion
ENV SESSION_COOKIE_MAX_AGE=86400

# Comando para iniciar la aplicación
CMD ["pnpm", "start"] 