import { describe, it, expect, beforeEach } from "bun:test";

function resetEnv() {
  for (const k of Object.keys(Bun.env)) {
    // do not clear unrelated, just keys we use
    if (k.startsWith("ORCA_") || k.startsWith("S3_") || k.startsWith("MINIO_")) {
      // @ts-ignore
      delete Bun.env[k];
    }
  }
}

describe("config env parsing", () => {
  beforeEach(() => {
    resetEnv();
  });

  it("parses ORCA_WATCH_FOLDERS csv", async () => {
    Bun.env.ORCA_WATCH_FOLDERS = "a , b,c";
    const { foldersToWatch } = await import(`../src/config.ts?case=${Date.now()}-1`);
    expect(foldersToWatch).toEqual(["a", "b", "c"]);
  });

  it("honors ORCA_BASE_PATH override", async () => {
    Bun.env.ORCA_BASE_PATH = "C:/tmp/orca-test-base";
    const { pathBase } = await import(`../src/config.ts?case=${Date.now()}-2`);
    expect(pathBase).toBe("C:/tmp/orca-test-base");
  });

  it("parses numeric envs and falls back when invalid", async () => {
    Bun.env.ORCA_DEBOUNCE_DELAY = "250";
    Bun.env.ORCA_MAX_RETRIES = "5";
    Bun.env.ORCA_RETRY_DELAY = "oops"; // invalid -> fallback to 1000
    const { DEBOUNCE_DELAY, MAX_RETRIES, RETRY_DELAY } = await import(`../src/config.ts?case=${Date.now()}-3`);
    expect(DEBOUNCE_DELAY).toBe(250);
    expect(MAX_RETRIES).toBe(5);
    expect(RETRY_DELAY).toBe(1000);
  });

  it("maps S3_* envs and supports MINIO_* fallbacks", async () => {
    Bun.env.S3_ACCESS_KEY = "ak";
    Bun.env.S3_SECRET_KEY = "sk";
    Bun.env.S3_BUCKET = "bucket";
    Bun.env.S3_REGION = "r1";
    Bun.env.S3_ENDPOINT = "ep";
    const c1 = await import(`../src/config.ts?case=${Date.now()}-4`);
    expect(c1.S3_ACCESS_KEY).toBe("ak");
    expect(c1.S3_SECRET_KEY).toBe("sk");
    expect(c1.S3_BUCKET).toBe("bucket");
    expect(c1.S3_REGION).toBe("r1");
    expect(c1.S3_ENDPOINT).toBe("ep");

    // Now without S3_* but with MINIO_* fallback
    resetEnv();
    Bun.env.MINIO_ACCESS_KEY = "ak2";
    Bun.env.MINIO_SECRET_KEY = "sk2";
    Bun.env.MINIO_BUCKET_NAME = "b2";
    const c2 = await import(`../src/config.ts?case=${Date.now()}-5`);
    expect(c2.S3_ACCESS_KEY).toBe("ak2");
    expect(c2.S3_SECRET_KEY).toBe("sk2");
    expect(c2.S3_BUCKET).toBe("b2");
  });
});
