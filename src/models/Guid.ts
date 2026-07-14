import { Entity } from "./Entity";
import * as Pids from "./PropertyIds.generated";

const PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateGuid(): string {
  return cryptoRandomUuid();
}

export function isValidGuid(value: unknown): value is string {
  return typeof value === "string" && PATTERN.test(value);
}

export function setGuidOn(entity: Entity): string {
  const guid = generateGuid();
  entity.setPropertyValue(Pids.MDC_P066, guid);
  return guid;
}

function cryptoRandomUuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return fallbackUuid();
}

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}
