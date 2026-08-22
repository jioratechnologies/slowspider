import "dotenv/config"; // loads apps/backend/.env — see .env.example for the required keys
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // Global response envelope: every success -> { ok: true, data }, every thrown Error ->
  // { ok: false, error } with the same status-code derivation as apps/web's
  // src/lib/api/handler.ts (errorResponse). See ResponseInterceptor / AllExceptionsFilter.
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`backend listening on http://localhost:${port}`);
}
bootstrap();
