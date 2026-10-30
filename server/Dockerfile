FROM node:24-alpine
WORKDIR /app
COPY src ./src
# named volume inherits this ownership on first mount
RUN mkdir -p /data && chown node:node /data
ENV NODE_ENV=production PORT=8787 DB_PATH=/data/haohn.db
USER node
EXPOSE 8787
CMD ["node", "src/server.mjs"]
