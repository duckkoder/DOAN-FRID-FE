# Build Stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Production env - relative paths go through nginx reverse proxy
# WebSocket URLs must be absolute (ws:// / wss://)
ENV VITE_API_BASE_URL=/api/v1
ENV VITE_WS_BASE_URL=wss://duckkoder.io.vn/ai-ws
ENV VITE_WS_FaceRegister_URL=wss://duckkoder.io.vn/api/v1/ws
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

