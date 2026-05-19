import { RequestHandler } from 'express';

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.path} tidak ditemukan`,
  });
};
