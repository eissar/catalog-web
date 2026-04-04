docker build -t ghcr.io/eissar/catalog-web-builder:latest .
docker login ghcr.io -u eissar -p $GH_PAT
docker push ghcr.io/eissar/catalog-web-builder:latest
docker logout ghcr.io
