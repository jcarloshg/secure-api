FROM node:20.19.4-alpine3.22

RUN addgroup backend_group && adduser -S -G backend_group user_back
USER user_back

WORKDIR /app/
RUN mkdir datos

COPY --chown=user_back:backend_group package*.json .

RUN npm install

COPY --chown=user_back:backend_group . .

RUN chmod 777 src/application/shared/infra/services/circuit-breaker-counter.json src/application/secure-inquiry/infraestructure/persist-file/db.json


EXPOSE 3000

CMD ["npm", "run", "dev"]