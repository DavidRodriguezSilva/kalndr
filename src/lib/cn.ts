import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Une clases condicionales y resuelve los choques de Tailwind quedandose con
 * la ultima. Es el mismo helper que usan las primitivas de shadcn/ui, y la
 * razon por la que una variante puede sobreescribir a otra sin `!important`.
 */
export function cn(...clases: ClassValue[]): string {
  return twMerge(clsx(clases));
}
