import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate UUID if not present in request headers
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    
    // Attach to request (cast to any to satisfy TS indexing rules)
    (req as any).id = requestId;
    
    // Set response header
    res.setHeader('x-request-id', requestId);
    
    next();
  }
}
