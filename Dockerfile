ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS migrate
COPY scripts/migrate.mjs ./scripts/migrate.mjs
COPY drizzle ./drizzle
CMD ["node", "scripts/migrate.mjs"]

FROM dependencies AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_TIME_ZONE=Asia/Bangkok
ENV NEXT_PUBLIC_APP_TIME_ZONE=${NEXT_PUBLIC_APP_TIME_ZONE}
COPY . .
RUN BETTER_AUTH_SECRET="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(48).toString("hex"))')" npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=dependencies --chown=node:node /app/node_modules/zod ./node_modules/zod
COPY --chown=node:node scripts/spending-review-worker.mjs scripts/spending-ollama-relay.mjs ./scripts/
COPY --chown=node:node src/lib/hermes-spending-review.mjs ./src/lib/
USER node
EXPOSE 3000
CMD ["node", "server.js"]
