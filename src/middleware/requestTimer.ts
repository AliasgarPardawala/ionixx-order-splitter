import { Request, Response, NextFunction } from 'express';

/** Logs "METHOD path STATUS duration_ms" for every request. */
export function requestTimer(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`);
  });

  next();
}
