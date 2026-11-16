FROM node:22-alpine

WORKDIR /app
COPY index.js ./index.js

ENV NODE_ENV=production
ENV PORT=3015

EXPOSE 3015

HEALTHCHECK --interval=20s --timeout=3s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3015) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
