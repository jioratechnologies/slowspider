import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AccountService } from "./account.service";
import { OtpService } from "./otp.service";
import { WorkspaceModule } from "../workspace/workspace.module";

@Module({
  imports: [WorkspaceModule], // completeSignup provisions the account's default workspace
  controllers: [AuthController],
  providers: [AccountService, OtpService],
  exports: [OtpService, AccountService],
})
export class AuthModule {}
