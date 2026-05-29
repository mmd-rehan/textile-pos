import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta: any;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        // Support bypass or customized structures if they are already wrapped
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const hasMeta = data && typeof data === 'object' && 'meta' in data;
        const hasData = data && typeof data === 'object' && 'data' in data;

        const responseData = hasData ? data.data : data;
        const responseMeta = hasMeta ? data.meta : {};

        return {
          success: true,
          data: responseData ?? null,
          meta: responseMeta,
        };
      }),
    );
  }
}
