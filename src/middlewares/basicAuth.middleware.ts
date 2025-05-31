import basicAuth from 'express-basic-auth';

const basicAuthMiddleware = basicAuth({
  users: {
    [process.env.BASIC_AUTH_USERNAME || 'admin']: process.env.BASIC_AUTH_PASSWORD || 'password',
  },
  challenge: true,
  realm: 'Restricted Area. Please login.',
  unauthorizedResponse: 'Unauthorized',
});

export default basicAuthMiddleware;
