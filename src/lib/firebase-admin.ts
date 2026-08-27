import "server-only";
import { getVercelOidcToken } from "@vercel/oidc";
import { Firestore, type Settings } from "@google-cloud/firestore";
import { ExternalAccountClient, GoogleAuth } from "google-auth-library";

let database: Firestore | undefined;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured`);
  return value;
}

function vercelAuthClient() {
  const projectNumber = required("GCP_PROJECT_NUMBER");
  const poolId = required("GCP_WORKLOAD_IDENTITY_POOL_ID");
  const providerId = required("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID");
  const serviceAccountEmail = required("GCP_SERVICE_ACCOUNT_EMAIL");
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
    subject_token_supplier: { getSubjectToken: async () => getVercelOidcToken() },
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });
  if (!client) throw new Error("Could not initialize the Google OIDC client");
  return client;
}

export function getDatabase() {
  if (database) return database;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId && process.env.NODE_ENV === "production") {
    throw new Error("FIREBASE_PROJECT_ID must be configured in production");
  }

  if (process.env.VERCEL) {
    const client = vercelAuthClient();
    const settings = {
      projectId,
      ignoreUndefinedProperties: true,
      auth: {
        getClient: async () => client,
        getUniverseDomain: async () => "googleapis.com",
        getProjectId: async () => projectId,
      },
    } as Settings & {
      auth: {
        getClient: () => Promise<typeof client>;
        getUniverseDomain: () => Promise<string>;
        getProjectId: () => Promise<string | undefined>;
      };
    };
    database = new Firestore(settings);
  } else {
    database = new Firestore({
      projectId,
      ignoreUndefinedProperties: true,
      auth: new GoogleAuth({
        projectId,
        scopes: ["https://www.googleapis.com/auth/datastore"],
      }),
    });
  }
  return database;
}

