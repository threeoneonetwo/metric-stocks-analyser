import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeTicker(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
