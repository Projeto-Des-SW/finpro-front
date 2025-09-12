# Stage 1: Build Angular
FROM node:20 AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

RUN npm run build -- --configuration production

# Stage 2: Serve com Nginx
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist/finpro-front /usr/share/nginx/html

EXPOSE 8080

CMD PORT=${PORT:-8080} sh -c 'echo "server { \
    listen $PORT; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files \$uri /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'
