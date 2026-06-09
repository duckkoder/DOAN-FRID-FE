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
ENV VITE_ATTENDANCE_CAMERA_FPS=5
ENV VITE_ATTENDANCE_CAMERA_MIN_FPS=2
ENV VITE_ATTENDANCE_CAMERA_MAX_FPS=6
ENV VITE_ATTENDANCE_CAMERA_JPEG_QUALITY=0.8
ENV VITE_ATTENDANCE_CAMERA_MAX_WIDTH=800
ENV VITE_ATTENDANCE_CAMERA_MAX_HEIGHT=450
ENV VITE_ATTENDANCE_WS_MAX_BUFFERED_BYTES=262144
ENV VITE_ATTENDANCE_BBOX_SMOOTHING_ALPHA=0.75

RUN npm run build

# Production Stage
FROM nginx:1.25-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
