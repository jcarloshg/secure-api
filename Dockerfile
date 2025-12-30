FROM node:20.19.4-alpine3.22

RUN addgroup backend_group && adduser -S -G backend_group user_back
USER user_back

WORKDIR /app/
RUN mkdir datos

COPY --chown=user_back:backend_group package*.json .

RUN npm install

COPY --chown=user_back:backend_group . .


EXPOSE 3000

CMD ["npm", "run", "dev"]