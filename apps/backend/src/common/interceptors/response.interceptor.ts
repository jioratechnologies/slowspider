import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

// Wraps every successful controller return value as { ok: true, data } — the Nest
// equivalent of apps/web's withApi/withApiAuth wrapping their handler's return value in
// NextResponse.json({ ok: true, data }) (src/lib/api/handler.ts).
//
// The cron controller injects @Res() directly and sends its own (differently-shaped)
// response, which bypasses this interceptor's effect entirely — see cron.controller.ts.
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { ok: true; data: T }> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<{ ok: true; data: T }> {
    return next.handle().pipe(map((data) => ({ ok: true as const, data })));
  }
}
