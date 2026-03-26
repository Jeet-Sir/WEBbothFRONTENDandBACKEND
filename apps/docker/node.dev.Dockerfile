FROM node:20-bookworm-slim

WORKDIR /workspace

COPY package*.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/website/package.json apps/website/package.json

RUN npm ci

EXPOSE 3000 4000
