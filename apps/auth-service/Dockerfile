# Etapa de construcción
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci                     # ← todas las dependencias (incluye TypeScript, etc.)
COPY . .
RUN npm run build

# Etapa de producción
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force   # ← solo producción
COPY --from=build /app/dist ./dist

# Copiar el script de semilla (opcional, si se ejecuta manualmente dentro del contenedor)
COPY --from=build /app/src/seeds ./seeds

EXPOSE 3000

CMD ["node", "dist/main"]