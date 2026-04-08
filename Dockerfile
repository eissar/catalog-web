FROM denoland/deno:alpine
RUN apk add --no-cache git rsync nodejs npm
RUN npm install -g wrangler@4.81.0

WORKDIR /app
COPY deno.json .
COPY _config.ts .
COPY build.ts .

# Create a dummy content dir so the build doesn't fail on missing catalog
RUN mkdir -p content/catalog && \
    echo '# dummy' > content/catalog/dummy.md && \
    deno task build || true

