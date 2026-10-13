FROM node:20-alpine AS build

WORKDIR /app

# Install exactly the tested versions from the lockfile (npm applies the
# security overrides in package.json; .npmrc sets legacy-peer-deps).
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ARG REACT_APP_POSTHOG_KEY
ARG REACT_APP_POSTHOG_HOST=https://us.i.posthog.com
ENV REACT_APP_POSTHOG_KEY=$REACT_APP_POSTHOG_KEY REACT_APP_POSTHOG_HOST=$REACT_APP_POSTHOG_HOST
RUN npm run build

# bust docker cache for multi-stage copy
RUN date +%s > /app/build/build-id.txt

FROM nginx:alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
