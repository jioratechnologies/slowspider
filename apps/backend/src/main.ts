import "dotenv/config"; // loads apps/backend/.env — see .env.example for the required keys
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RealtimeGateway } from "./realtime/realtime.gateway";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Global response envelope: every success -> { ok: true, data }, every thrown Error ->
  // { ok: false, error } with the same status-code derivation as apps/web's
  // src/lib/api/handler.ts (errorResponse). See ResponseInterceptor / AllExceptionsFilter.
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Attaches a plain `ws` server (noServer mode) onto Nest's own underlying HTTP server for
  // GET /v1/realtime upgrades — the authenticated relay that replaced browsers connecting
  // directly to NATS. Must happen before app.listen() so the 'upgrade' listener is in place
  // before any connection can arrive. See realtime/realtime.gateway.ts.
  app.get(RealtimeGateway).attach(app.getHttpServer());

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`backend listening on http://0.0.0.0:${port} (LAN: http://192.168.1.5:${port})`);
}
bootstrap();
