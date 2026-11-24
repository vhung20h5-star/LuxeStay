import type { AuthUser } from "@luxestay/contracts";

export interface ApiEnvBindings {
  Variables: {
    requestId: string;
    authUser: AuthUser | null;
    sessionToken: string | null;
  };
}
