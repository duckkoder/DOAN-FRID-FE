# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Production env - Vite reads VITE_* variables at build time.
ENV VITE_API_BASE_URL=/api/v1
ENV VITE_WS_BASE_URL=wss://duckkoder.io.vn
ENV VITE_WS_FaceRegister_URL=wss://duckkoder.io.vn
ENV VITE_AUTH_COOKIE_SECRET=change-this-cookie-secret
ENV VITE_ATTENDANCE_ALLOW_CREATE_ANYTIME=false
ENV VITE_ATTENDANCE_CREATE_WINDOW_GRACE_MINUTES=0

RUN npm run build

# Production Stage
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
