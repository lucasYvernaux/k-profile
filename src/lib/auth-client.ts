"use client";

import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [
    // The sign-in form handles the redirect to /connexion/2fa itself.
    twoFactorClient(),
  ],
});
