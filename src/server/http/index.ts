import { createServer, Server } from 'http';
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cors from 'cors';

import { logger } from '@/utils/logging/logger';
import { apiRouter } from '@/routes';
import { notFoundHandler } from '@/middlewares/notFoundHandler';
import { errorHandler } from '@/middlewares/errorHandler';

export function initServer(): Server {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  morgan.token('json', (req: any, res: any) =>
    JSON.stringify({
      method: req.method,
      url: req.url,
      body: req.body,
      statusCode: res.statusCode,
      resBody: res.body,
      pid: process.pid,
      ip: req.connection.remoteAddress,
      user: req.user,
    }),
  );
  app.use(
    morgan((token, req, res) => token.json(req, res), {
      skip: (req, res) => res.statusCode >= 400,
      stream: {
        write: (text: string) => {
          const log = text.replace(/\n$/, '');
          const { method, url, statusCode, ...json } = JSON.parse(log);
          if (json.body?.password) {
            json.body.password = '*****';
          }
          logger.http({
            message: `${statusCode} ${method} ${url}`,
            ...json,
          });
        },
      },
    }),
  );
  app.use(
    morgan((tokens, req, res) => tokens.json(req, res), {
      skip: (req, res) => res.statusCode < 400,
      stream: {
        write: (text: string) => {
          const log = text.replace(/\n$/, '');
          const { method, url, statusCode, ...json } = JSON.parse(log);
          if (json.body?.password) {
            json.body.password = '*****';
          }
          logger.error({
            message: `${statusCode} ${method} ${url}`,
            ...json,
          });
        },
      },
    }),
  );

  app.use(apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return createServer(app);
}
