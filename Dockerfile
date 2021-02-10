FROM node:14

# создание директории приложения
WORKDIR /app

# установка зависимостей
COPY package*.json ./

RUN npm install
RUN npm install pm2 -g

# копируем исходный код
COPY . .

# Сервер с менеджером в работе
CMD ["pm2-runtime", "index.js"]
